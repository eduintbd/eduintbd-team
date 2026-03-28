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

    const { employeeId, actionType } = await req.json();
    
    console.log('Creating bank verification task for employee:', employeeId, 'Action:', actionType);

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

    // Create task title and description based on action type
    let title = '';
    let description = '';
    
    if (actionType === 'upload') {
      title = `Verify Bank Details - ${employee.first_name} ${employee.last_name}`;
      description = `Employee ${employee.employee_code} (${employee.first_name} ${employee.last_name}) has uploaded bank documents for verification. Please review and verify their banking information.`;
    } else if (actionType === 'update_request') {
      title = `Bank Details Update Request - ${employee.first_name} ${employee.last_name}`;
      description = `Employee ${employee.employee_code} (${employee.first_name} ${employee.last_name}) has requested to update their verified bank details. Please review the requested changes.`;
    }

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
        priority: 'high',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
      })
      .select()
      .single();

    if (taskError) {
      console.error('Error creating task:', taskError);
      throw taskError;
    }

    console.log('Task created successfully:', task.id);

    return new Response(
      JSON.stringify({ success: true, taskId: task.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-bank-verification-task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
