const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration - FIXED for https://www.mizan.work
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://mizan.work',
    'https://www.mizan.work'  // ← THIS FIXES THE CORS ISSUE
  ],
  credentials: true
}));

app.use(express.json());

// Mock clients data
const clients = [
  {
    id: '1',
    name: 'TechCorp Inc',
    email: 'admin@techcorp.com',
    plan: 'pro',
    employees: '75',
    industry: 'Technology',
    status: 'active',
    lastActive: '2 hours ago',
    mrr: 79,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'InnovateLab',
    email: 'contact@innovatelab.com',
    plan: 'enterprise',
    employees: '150',
    industry: 'Consulting',
    status: 'active',
    lastActive: '1 hour ago',
    mrr: 199,
    createdAt: new Date().toISOString()
  }
];

// Routes
app.get('/api/superadmin/clients', (req, res) => {
  res.json({
    success: true,
    clients
  });
});

// Analysis endpoint
app.post('/api/superadmin/clients/:clientId/analyze', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { analysisType } = req.body;
    
    console.log(`Running ${analysisType} analysis for client ${clientId}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const analysisResults = {
      culture: {
        success: true,
        analysisId: `culture-${clientId}-${Date.now()}`,
        clientId,
        analysisType: 'culture',
        scores: {
          alignment: 85,
          engagement: 78,
          satisfaction: 82,
          recognition: 75
        },
        insights: [
          "Strong cultural alignment with stated values (85%)",
          "Employee engagement shows room for improvement (78%)",
          "Recognition systems could be enhanced (75%)",
          "Overall culture health is good with specific improvement areas"
        ],
        recommendations: [
          "Implement quarterly culture pulse surveys",
          "Develop peer recognition program",
          "Create culture ambassador roles",
          "Establish regular feedback sessions"
        ],
        generatedAt: new Date().toISOString()
      },
      structure: {
        success: true,
        analysisId: `structure-${clientId}-${Date.now()}`,
        clientId,
        analysisType: 'structure',
        efficiency: 88,
        insights: [
          "Organizational structure supports current scale effectively",
          "Clear reporting lines with appropriate span of control",
          "Some departments could benefit from cross-functional collaboration",
          "Decision-making processes are well-defined"
        ],
        recommendations: [
          "Review manager-to-employee ratios in growing departments",
          "Clarify role responsibilities in overlapping areas",
          "Implement cross-functional collaboration protocols",
          "Establish regular structure review cycles"
        ],
        generatedAt: new Date().toISOString()
      },
      skills: {
        success: true,
        analysisId: `skills-${clientId}-${Date.now()}`,
        clientId,
        analysisType: 'skills',
        gaps: [
          { skill: "Digital Marketing", gap: "Medium", priority: "High", affectedEmployees: 15 },
          { skill: "Data Analysis", gap: "Low", priority: "Medium", affectedEmployees: 8 },
          { skill: "Leadership", gap: "High", priority: "High", affectedEmployees: 12 }
        ],
        insights: [
          "Strong technical skills across engineering teams",
          "Digital marketing capabilities need development",
          "Leadership skills gap identified in middle management",
          "Data analysis skills are adequate but could be enhanced"
        ],
        recommendations: [
          "Develop comprehensive digital marketing training program",
          "Create mentorship programs for leadership development",
          "Invest in data analytics tools and training",
          "Establish skills assessment and development framework"
        ],
        generatedAt: new Date().toISOString()
      }
    };

    const result = analysisResults[analysisType];
    if (!result) {
      return res.status(400).json({
        success: false,
        error: `Unknown analysis type: ${analysisType}`
      });
    }

    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Analysis failed'
    });
  }
});

// Data status endpoint
app.get('/api/superadmin/clients/:clientId/data', (req, res) => {
  try {
    const { clientId } = req.params;
    
    const dataStatus = {
      culture: {
        hasData: true,
        required: 'Employee surveys',
        status: 'complete',
        count: 45,
        lastUpdated: new Date().toISOString()
      },
      structure: {
        hasData: true,
        required: 'Org chart',
        status: 'complete',
        lastUpdated: new Date().toISOString()
      },
      skills: {
        hasData: false,
        required: 'Employee profiles',
        status: 'missing',
        count: 0,
        lastUpdated: null
      }
    };

    res.json({
      success: true,
      clientId,
      dataStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data status'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🌐 CORS enabled for: https://www.mizan.work`);
});
