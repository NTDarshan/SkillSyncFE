import React, { useState, useCallback } from 'react';
import { Upload, FileText, User, Mail, Award, Clock, CheckCircle, XCircle, Loader2, Copy, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ResumeResponse {
  candidate_name: string;
  candidate_email: string;
  resume_skills: string[];
  required_skills: string[];
  matching_skills: string[];
  missing_skills: string[];
  candidate_experience_years: number;
  required_experience_years: number;
  experience_summary: string;
  final_score: number;
  final_recommendation: string;
  detailed_report: string;
  email_template: string;
}

interface LoadingMessage {
  message: string;
  timestamp: number;
}

const SkillSync: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<LoadingMessage>({ message: '', timestamp: 0 });
  const [result, setResult] = useState<ResumeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [copiedEmail, setCopiedEmail] = useState(false);

  const loadingMessages = [
    { message: 'Analyzing resume...', delay: 0 },
    { message: 'Evaluating skills match...', delay: 15000 },
    { message: 'Generating final report...', delay: 30000 },
    { message: 'Almost done...', delay: 60000 },
    { message: 'Finalizing recommendations...', delay: 90000 }
  ];

  const updateLoadingMessage = useCallback(() => {
    const startTime = Date.now();
    
    const updateMessage = () => {
      const elapsed = Date.now() - startTime;
      const currentMessage = loadingMessages.reduce((prev, current) => {
        return elapsed >= current.delay ? current : prev;
      });
      
      setLoadingMessage({ message: currentMessage.message, timestamp: Date.now() });
      
      if (elapsed < 120000) { // Stop after 2 minutes
        setTimeout(updateMessage, 1000);
      }
    };
    
    updateMessage();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF or DOCX file');
        return;
      }
      
      if (selectedFile.size > maxSize) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !jobDescription.trim()) {
      setError('Please provide both resume file and job description');
      return;
    }
    
    setLoading(true);
    setError(null);
    updateLoadingMessage();
    
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('job_description', jobDescription);
    
    try {
      let api_url = 'https://skillsync-ozan.onrender.com/upload'
      const response = await fetch(api_url, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ResumeResponse = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  const parseDetailedReport = (report: string): Record<string, string> => {
    const sections: Record<string, string> = {};
    const lines = report.split('\n');
    let currentSection = '';
    let currentContent = '';
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.match(/^##?\s*[A-Z][A-Z\s]+$/)) {
        if (currentSection) {
          sections[currentSection] = currentContent.trim();
        }
        currentSection = trimmedLine.replace(/^##?\s*/, '');
        currentContent = '';
      } else if (trimmedLine) {
        currentContent += line + '\n';
      }
    });
    
    if (currentSection) {
      sections[currentSection] = currentContent.trim();
    }
    
    return sections;
  };

  const sanitizeReportText = (text: string) => {
    return text.replace(/\*\*/g, '');
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyEmailTemplate = async () => {
    if (result?.email_template) {
      try {
        await navigator.clipboard.writeText(result.email_template);
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } catch (err) {
        console.error('Failed to copy email template:', err);
      }
    }
  };

  const resetForm = () => {
    setFile(null);
    setJobDescription('');
    setResult(null);
    setError(null);
    setExpandedSections({});
    setCopiedEmail(false);
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation.toLowerCase()) {
      case 'yes':
        return 'text-green-400 bg-green-900/20';
      case 'no':
        return 'text-red-400 bg-red-900/20';
      case 'maybe':
      default:
        return 'text-yellow-400 bg-yellow-900/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-400 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold mb-4">Processing Resume</h2>
          <p className="text-gray-300 text-lg">{loadingMessage.message}</p>
          <div className="mt-6 w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    const reportSections = parseDetailedReport(result.detailed_report);
    
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-blue-400">SkillSync</h1>
            <button
              onClick={resetForm}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              New Analysis
            </button>
          </div>

          {/* Candidate Overview */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <User className="w-6 h-6 text-blue-400" />
              Candidate Overview
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-lg"><span className="text-gray-400">Name:</span> {result.candidate_name}</p>
                <p className="text-lg"><span className="text-gray-400">Email:</span> {result.candidate_email}</p>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(result.final_score)} mb-2`}>
                  {result.final_score}%
                </div>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRecommendationColor(result.final_recommendation)}`}>
                  {result.final_recommendation.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Skills Comparison */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-400" />
              Skills Analysis
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-green-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Matching Skills ({result.matching_skills.length})
                </h3>
                <div className="space-y-2">
                  {result.matching_skills.map((skill, index) => (
                    <div key={index} className="bg-green-900/20 text-green-300 px-3 py-2 rounded">
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-red-400 mb-3 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Missing Skills ({result.missing_skills.length})
                </h3>
                <div className="space-y-2">
                  {result.missing_skills.map((skill, index) => (
                    <div key={index} className="bg-red-900/20 text-red-300 px-3 py-2 rounded">
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Experience Evaluation */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-400" />
              Experience Evaluation
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-lg mb-2">
                  <span className="text-gray-400">Candidate Experience:</span> {result.candidate_experience_years} years
                </p>
                <p className="text-lg mb-4">
                  <span className="text-gray-400">Required Experience:</span> {result.required_experience_years} years
                </p>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  result.candidate_experience_years >= result.required_experience_years 
                    ? 'text-green-400 bg-green-900/20' 
                    : 'text-yellow-400 bg-yellow-900/20'
                }`}>
                  {result.candidate_experience_years >= result.required_experience_years ? 'Meets Requirements' : 'Below Requirements'}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-3">Experience Summary</h3>
                <p className="text-gray-300 leading-relaxed">{result.experience_summary}</p>
              </div>
            </div>
          </div>

          {/* Detailed Report */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-400" />
              Detailed Report
            </h2>
            <div className="space-y-4">
              {Object.entries(reportSections).map(([title, content]) => (
                <div key={title} className="border border-gray-700 rounded-lg">
                  <button
                    onClick={() => toggleSection(title)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700 transition-colors"
                  >
                    <h3 className="text-lg font-medium">{title}</h3>
                    {expandedSections[title] ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                  {expandedSections[title] && (
                    <div className="px-4 pb-4">
                      <div className="text-gray-300 whitespace-pre-wrap">{sanitizeReportText(content)}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Email Template */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Mail className="w-6 h-6 text-blue-400" />
                Email Template
              </h2>
              <button
                onClick={copyEmailTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copiedEmail ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {result.email_template}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-blue-400 mb-4">SkillSync</h1>
          <p className="text-xl text-gray-300">AI-Powered Resume Screening for HR Professionals</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-8 shadow-2xl">
          <h2 className="text-3xl font-semibold mb-8 text-center">Resume Analysis</h2>
          
          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-lg font-medium mb-3">Resume File *</label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 hover:border-blue-400 transition-colors">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-2">Drop your resume here or click to browse</p>
                  <p className="text-sm text-gray-500">PDF or DOCX format, max 10MB</p>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors"
                  >
                    Choose File
                  </label>
                  {file && (
                    <p className="mt-3 text-green-400 flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" />
                      {file.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label htmlFor="job-description" className="block text-lg font-medium mb-3">
                Job Description *
              </label>
              <textarea
                id="job-description"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Enter the job description here..."
                rows={6}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!file || !jobDescription.trim()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-colors"
            >
              Analyze Resume
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SkillSync;