import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { employeeId, updateRequestId } = await req.json();
    
    console.log('Creating profile review task for employee:', employeeId);

    // Get employee details
    const { data: employee, error: employeeError } = await supabaseClient
      .from('employees')
      .select('first_name, last_name, employee_code, manager_id')
      .eq('id', employeeId)
      .single();

    if (employeeError) {
      console.error('Error fetching employee:', employeeError);
      throw employeeError;
    }

    // Determine who should be assigned the task (manager, HR manager, or admin)
    let assignedTo = employee.manager_id;

    // If no manager assigned, find HR manager or admin
    if (!assignedTo) {
      const { data: hrManagers } = await supabaseClient
        .from('user_roles')
        .select('user_id')
        .or('role.eq.hr_manager,role.eq.admin')
        .limit(1);

      if (hrManagers && hrManagers.length > 0) {
        // Get employee record for this user
        const { data: hrEmployee } = await supabaseClient
          .from('employees')
          .select('id')
          .eq('user_id', hrManagers[0].user_id)
          .single();
        
        if (hrEmployee) {
          assignedTo = hrEmployee.id;
        }
      }
    }

    if (!assignedTo) {
      throw new Error('No manager or HR staff found to assign task');
    }

    // Create task
    const title = `Review Profile Update - ${employee.first_name} ${employee.last_name}`;
    const description = `Employee ${employee.employee_code} (${employee.first_name} ${employee.last_name}) has submitted profile information updates for your review and approval.`;

    // Get the current user (who created the request)
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { data: currentEmployee } = await supabaseClient
      .from('employees')
      .select('id')
      .eq('user_id', user?.id)
      .single();

    // Create the task
    const { data: task, error: taskError } = await supabaseClient
      .from('tasks')
      .insert({
        title,
        description,
        assigned_to: assignedTo,
        assigned_by: currentEmployee?.id,
        status: 'pending',
        priority: 'medium',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      })
      .select()
      .single();

    if (taskError) {
      console.error('Error creating task:', taskError);
      throw taskError;
    }

    console.log('Profile review task created successfully:', task.id);

    return new Response(
      JSON.stringify({ success: true, taskId: task.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-profile-review-task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
