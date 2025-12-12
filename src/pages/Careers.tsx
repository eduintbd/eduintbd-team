import { useState } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  GraduationCap,
  Globe,
  TrendingUp,
  Lightbulb,
  Users,
  Heart,
  Target,
  BookOpen,
  Briefcase,
  MapPin,
  Clock,
  ChevronRight,
  Upload,
  CheckCircle2,
  Send,
  Linkedin,
  Facebook,
  Youtube,
  Mail,
  Phone,
  Building2,
  Sparkles,
  Award,
  MessageSquare,
  FileText,
  UserCheck,
  Rocket,
  Shield,
} from "lucide-react";

const COMPANY_NAME = "EDUINT Education Consultancy";

const openPositions = [
  {
    id: 1,
    title: "Senior Student Counsellor",
    department: "Counselling",
    location: "Dhaka",
    type: "Full-time",
    experience: "Mid",
    highlights: [
      "Guide 50+ students monthly through admission process",
      "Build relationships with partner universities",
      "Lead junior counsellor training sessions",
    ],
  },
  {
    id: 2,
    title: "Digital Marketing Specialist",
    department: "Marketing",
    location: "Hybrid",
    type: "Full-time",
    experience: "Junior",
    highlights: [
      "Create engaging content for social media campaigns",
      "Manage paid advertising across platforms",
      "Analyze and optimize campaign performance",
    ],
  },
  {
    id: 3,
    title: "Operations Coordinator",
    department: "Operations",
    location: "Dhaka",
    type: "Full-time",
    experience: "Junior",
    highlights: [
      "Streamline visa documentation processes",
      "Coordinate with universities and embassies",
      "Support student journey from enrollment to departure",
    ],
  },
  {
    id: 4,
    title: "HR & Talent Acquisition Executive",
    department: "HR",
    location: "Dhaka",
    type: "Full-time",
    experience: "Mid",
    highlights: [
      "Lead end-to-end recruitment for growing team",
      "Design employee engagement initiatives",
      "Build employer brand and talent pipeline",
    ],
  },
  {
    id: 5,
    title: "Graduate Trainee - Counselling",
    department: "Counselling",
    location: "Dhaka",
    type: "Internship",
    experience: "Intern",
    highlights: [
      "3-month structured training program",
      "Shadow senior counsellors on real cases",
      "Path to full-time role upon completion",
    ],
  },
  {
    id: 6,
    title: "Content & Video Creator",
    department: "Marketing",
    location: "Remote",
    type: "Full-time",
    experience: "Junior",
    highlights: [
      "Produce educational videos for students",
      "Write blog posts and success stories",
      "Create visual content for campaigns",
    ],
  },
];

const roles = [
  {
    icon: GraduationCap,
    title: "Student Counsellors & Admissions Advisors",
    description: "Guide students from first inquiry to successful enrolment at top universities.",
  },
  {
    icon: Globe,
    title: "Education Consultants",
    description: "Manage university relationships and promote programs across destinations.",
  },
  {
    icon: Sparkles,
    title: "Digital Marketing & Content Specialists",
    description: "Drive social media, campaigns, video production, and brand storytelling.",
  },
  {
    icon: Briefcase,
    title: "Operations & Student Support",
    description: "Handle documentation, visa coordination, and backend processes seamlessly.",
  },
  {
    icon: Users,
    title: "HR & Talent Acquisition",
    description: "Build and develop our internal team of education professionals.",
  },
  {
    icon: Rocket,
    title: "Interns & Graduate Trainees",
    description: "For fresh graduates eager to start their career in education or marketing.",
  },
];

const values = [
  {
    icon: Heart,
    title: "Student-First Guidance",
    description: "Ethical, transparent counselling that puts students and parents first.",
  },
  {
    icon: Target,
    title: "Ownership & Accountability",
    description: "Clear targets, room to experiment, and recognition for results.",
  },
  {
    icon: BookOpen,
    title: "Continuous Learning",
    description: "Workshops, training programs, and access to learning resources.",
  },
  {
    icon: Lightbulb,
    title: "Innovation in Education",
    description: "Embrace new tools, AI, and digital strategies to stay ahead.",
  },
];

const testimonials = [
  {
    name: "Fatima Rahman",
    role: "Senior Counsellor",
    quote: "In two years, I've helped 200+ students achieve their dreams. The growth opportunities here are unmatched.",
  },
  {
    name: "Arif Hossain",
    role: "Marketing Lead",
    quote: "The freedom to experiment with new ideas and see real impact keeps me motivated every day.",
  },
  {
    name: "Nusrat Jahan",
    role: "Operations Coordinator",
    quote: "From intern to team lead in 18 months - the mentorship culture here made it possible.",
  },
];

const hiringSteps = [
  {
    step: 1,
    icon: FileText,
    title: "Apply Online",
    description: "Submit your CV and basic details through our careers form.",
  },
  {
    step: 2,
    icon: MessageSquare,
    title: "Screening",
    description: "HR reviews your profile and schedules a quick introductory call.",
  },
  {
    step: 3,
    icon: Users,
    title: "Interview(s)",
    description: "Meet with hiring manager; may include a task relevant to the role.",
  },
  {
    step: 4,
    icon: Award,
    title: "Offer",
    description: "Successful candidates receive a clear offer with role expectations.",
  },
  {
    step: 5,
    icon: Rocket,
    title: "Onboarding",
    description: "Structured onboarding with 30-90 day goals and training support.",
  },
];

const whyJoinUs = [
  {
    icon: Heart,
    title: "Meaningful Work",
    description: "Directly help students and families make life-changing education decisions.",
  },
  {
    icon: Globe,
    title: "Global Exposure",
    description: "Work with universities across Korea, Japan, Australia, and New Zealand.",
  },
  {
    icon: TrendingUp,
    title: "Skill Growth",
    description: "Training in counselling, sales, digital marketing, and financial literacy.",
  },
  {
    icon: Lightbulb,
    title: "Modern Tools",
    description: "Use CRM, marketing automation, and AI instead of manual processes.",
  },
  {
    icon: Users,
    title: "Supportive Culture",
    description: "Mentoring, open communication, and clear feedback loops.",
  },
];

export default function Careers() {
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [experienceFilter, setExperienceFilter] = useState<string>("all");
  const [joinTalentPool, setJoinTalentPool] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPositions = openPositions.filter((position) => {
    if (departmentFilter !== "all" && position.department !== departmentFilter) return false;
    if (locationFilter !== "all" && position.location !== locationFilter) return false;
    if (experienceFilter !== "all" && position.experience !== experienceFilter) return false;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success("Application submitted successfully!", {
      description: joinTalentPool 
        ? "You've also been added to our talent pool for future opportunities."
        : "We'll review your application and get back to you soon.",
    });
    
    setIsSubmitting(false);
    (e.target as HTMLFormElement).reset();
    setJoinTalentPool(false);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Helmet>
        <title>Careers at {COMPANY_NAME} | Education Consultancy Jobs</title>
        <meta 
          name="description" 
          content="Join our team at EDUINT Education Consultancy. Find rewarding careers in student counselling, education consulting, marketing, and operations. Help students achieve their global education dreams." 
        />
        <meta name="keywords" content="education consultancy careers, student recruitment jobs, study abroad counsellor jobs, education jobs Dhaka, EDUINT careers" />
        <link rel="canonical" href="/careers" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl">{COMPANY_NAME}</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => scrollToSection("roles")} className="text-muted-foreground hover:text-foreground transition-colors">
                Roles
              </button>
              <button onClick={() => scrollToSection("positions")} className="text-muted-foreground hover:text-foreground transition-colors">
                Open Positions
              </button>
              <button onClick={() => scrollToSection("culture")} className="text-muted-foreground hover:text-foreground transition-colors">
                Culture
              </button>
              <button onClick={() => scrollToSection("apply")} className="text-muted-foreground hover:text-foreground transition-colors">
                Apply
              </button>
            </div>
            <Button onClick={() => scrollToSection("positions")}>
              View Open Roles
            </Button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10 py-20 lg:py-32">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="container mx-auto px-4 relative">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6 px-4 py-2">
                <Sparkles className="h-4 w-4 mr-2" />
                We're Hiring!
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Build Your Career Shaping Global Education Journeys
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join a fast-growing education consultancy poised to help student identify their passion for their career and study in Australia, Canada, New Zealand, South Korea, UK, USA & in Europe.
              </p>
              <p className="text-base text-muted-foreground mb-10 max-w-xl mx-auto">
                Make a real impact on students, families, and schools while building an exceptional career with continuous learning and growth opportunities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => scrollToSection("positions")} className="text-lg px-8">
                  View Open Roles
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollToSection("apply")} className="text-lg px-8">
                  Join Our Talent Pool
                </Button>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -bottom-10 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
        </section>

        {/* Why Join Us Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Why {COMPANY_NAME}?</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Where Purpose Meets Growth
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We're on a mission to empower students globally, simplify admissions, and improve financial literacy. Here's why our team loves being part of this journey.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {whyJoinUs.map((item, index) => (
                <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Teams & Roles Section */}
        <section id="roles" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Teams & Roles</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Find Your Place in Our Team
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Whether you're a fresh graduate or an experienced professional, we have structured onboarding and training to help you thrive.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {roles.map((role, index) => (
                <Card key={index} className="group hover:shadow-md transition-all duration-300 bg-background border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <role.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{role.title}</h3>
                        <p className="text-muted-foreground text-sm">{role.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-center mt-8 text-muted-foreground">
              <CheckCircle2 className="inline h-4 w-4 mr-2 text-primary" />
              Both freshers and experienced professionals are welcome
            </p>
          </div>
        </section>

        {/* Open Positions Section */}
        <section id="positions" className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Open Positions</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Find Your Next Role in Global Education
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Explore current opportunities and take the first step towards a meaningful career.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 justify-center mb-8">
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="Counselling">Counselling</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="Dhaka">Dhaka</SelectItem>
                  <SelectItem value="Remote">Remote</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Intern">Intern</SelectItem>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Mid">Mid-Level</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Job Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {filteredPositions.map((position) => (
                <Card key={position.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight">{position.title}</CardTitle>
                      <Badge variant="secondary" className="shrink-0">{position.type}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="flex items-center text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 mr-1" />
                        {position.department}
                      </span>
                      <span className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        {position.location}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-2 mb-4 flex-1">
                      {position.highlights.map((highlight, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full mt-auto" onClick={() => scrollToSection("apply")}>
                      Apply Now
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredPositions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No positions match your filters.</p>
                <Button variant="outline" onClick={() => {
                  setDepartmentFilter("all");
                  setLocationFilter("all");
                  setExperienceFilter("all");
                }}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Culture & Values Section */}
        <section id="culture" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Life at {COMPANY_NAME}</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Our Culture & Values
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We're student-first, data-informed, collaborative, and growth-oriented. Every team member contributes to shaping global education journeys.
              </p>
            </div>

            {/* Values */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mb-16">
              {values.map((value, index) => (
                <Card key={index} className="text-center bg-background border-border/50">
                  <CardContent className="p-6">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <value.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground text-sm">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Testimonials */}
            <div className="max-w-4xl mx-auto">
              <h3 className="text-xl font-semibold text-center mb-8">What Our Team Says</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonials.map((testimonial, index) => (
                  <Card key={index} className="bg-background">
                    <CardContent className="p-6">
                      <p className="text-muted-foreground italic mb-4">"{testimonial.quote}"</p>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="font-semibold text-primary">{testimonial.name[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{testimonial.name}</p>
                          <p className="text-muted-foreground text-xs">{testimonial.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div className="mt-16 max-w-3xl mx-auto text-center">
              <h3 className="text-xl font-semibold mb-6">Benefits & Perks</h3>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  "Performance Bonuses",
                  "Flexible Hours",
                  "Learning Support",
                  "Friendly Office",
                  "Team Events",
                  "Career Growth Path",
                ].map((benefit) => (
                  <Badge key={benefit} variant="outline" className="px-4 py-2 text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-primary" />
                    {benefit}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Hiring Process Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Our Hiring Process</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Simple, Transparent, Respectful
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We value your time and aim to make the hiring experience as smooth as possible.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="relative">
                {/* Timeline line */}
                <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />
                
                <div className="space-y-8">
                  {hiringSteps.map((step, index) => (
                    <div key={step.step} className={`flex items-center gap-8 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                      <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                        <Card className="inline-block bg-background">
                          <CardContent className="p-6">
                            <div className={`flex items-center gap-3 mb-2 ${index % 2 === 0 ? 'md:justify-end' : 'md:justify-start'}`}>
                              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                                {step.step}
                              </div>
                              <h3 className="font-semibold">{step.title}</h3>
                            </div>
                            <p className="text-muted-foreground text-sm">{step.description}</p>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="hidden md:flex h-12 w-12 rounded-full bg-primary/10 items-center justify-center shrink-0 relative z-10">
                        <step.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 hidden md:block" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Application Form Section */}
        <section id="apply" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <Badge variant="outline" className="mb-4">Apply Now</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Start Your Journey With Us
                </h2>
                <p className="text-muted-foreground">
                  Fill out the form below and we'll get back to you soon. Your data is handled securely.
                </p>
              </div>

              <Card className="bg-background">
                <CardContent className="p-6 md:p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input id="fullName" name="fullName" required placeholder="Your full name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input id="email" name="email" type="email" required placeholder="you@example.com" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input id="phone" name="phone" type="tel" required placeholder="+880 1XXX-XXXXXX" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Your Location *</Label>
                        <Input id="location" name="location" required placeholder="City, Country" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="role">Role of Interest *</Label>
                        <Select name="role" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="counsellor">Student Counsellor</SelectItem>
                            <SelectItem value="consultant">Education Consultant</SelectItem>
                            <SelectItem value="marketing">Digital Marketing</SelectItem>
                            <SelectItem value="content">Content Creator</SelectItem>
                            <SelectItem value="operations">Operations</SelectItem>
                            <SelectItem value="hr">HR & Recruitment</SelectItem>
                            <SelectItem value="intern">Internship</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="experience">Experience Level *</Label>
                        <Select name="experience" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="intern">Intern / Fresh Graduate</SelectItem>
                            <SelectItem value="junior">Junior (1-2 years)</SelectItem>
                            <SelectItem value="mid">Mid-Level (3-5 years)</SelectItem>
                            <SelectItem value="senior">Senior (5+ years)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cv">Upload CV/Resume *</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                        <Input id="cv" name="cv" type="file" accept=".pdf,.doc,.docx" required className="hidden" />
                        <label htmlFor="cv" className="cursor-pointer">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PDF, DOC, DOCX (max 5MB)
                          </p>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn Profile (Optional)</Label>
                      <Input id="linkedin" name="linkedin" type="url" placeholder="https://linkedin.com/in/yourprofile" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whyUs">Why do you want to work with us? *</Label>
                      <Textarea
                        id="whyUs"
                        name="whyUs"
                        required
                        placeholder="Tell us what excites you about this opportunity and how you can contribute..."
                        className="min-h-[120px]"
                      />
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="talentPool"
                        checked={joinTalentPool}
                        onCheckedChange={(checked) => setJoinTalentPool(checked as boolean)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="talentPool"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Join our Talent Pool
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Keep me informed about future opportunities even if current roles aren't a fit.
                        </p>
                      </div>
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5" />
                          Submit Application
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                      <Shield className="h-3.5 w-3.5" />
                      Your data is secure and will only be used for recruitment purposes.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-foreground text-background py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="h-8 w-8" />
                  <span className="font-bold text-xl">{COMPANY_NAME}</span>
                </div>
                <p className="text-background/70 mb-6 max-w-md">
                  Empowering students to achieve their global education dreams through ethical counselling and comprehensive support. Join us in making a difference.
                </p>
                <div className="flex gap-4">
                  <a href="#" className="h-10 w-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors">
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a href="#" className="h-10 w-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors">
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a href="#" className="h-10 w-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors">
                    <Youtube className="h-5 w-5" />
                  </a>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Quick Links</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-background/70 hover:text-background transition-colors">About Us</a></li>
                  <li><a href="#" className="text-background/70 hover:text-background transition-colors">Services</a></li>
                  <li><a href="#" className="text-background/70 hover:text-background transition-colors">Careers</a></li>
                  <li><a href="#" className="text-background/70 hover:text-background transition-colors">Contact</a></li>
                  <li><a href="#" className="text-background/70 hover:text-background transition-colors">Privacy Policy</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Contact</h4>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-background/70">
                    <Mail className="h-4 w-4" />
                    careers@eduint.com
                  </li>
                  <li className="flex items-center gap-2 text-background/70">
                    <Phone className="h-4 w-4" />
                    +880 1XXX-XXXXXX
                  </li>
                  <li className="flex items-center gap-2 text-background/70">
                    <MapPin className="h-4 w-4" />
                    Dhaka, Bangladesh
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-background/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-background/50 text-sm">
                © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
              </p>
              <p className="text-background/50 text-sm text-center">
                We welcome applications from diverse backgrounds and are committed to equal opportunity hiring.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
