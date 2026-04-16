import React, { useState } from 'react';
import { UserProfile } from '../lib/gemini';
import { FileText, Download, Edit3, Save, Plus, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export function CVBuilder({ profile, t }: { profile: UserProfile, t: (p: string) => string }) {
  const [cvData, setCvData] = useState({ ...profile, skills: profile.skills || [], experiences: profile.experiences || [], education: profile.education || [], languages: profile.languages || [] });
  const [isEditing, setIsEditing] = useState(false);

  const handleDownload = async () => {
    const element = document.getElementById('cv-preview');
    if (!element) return;
    
    // Temporarily hide edit buttons for PDF
    element.classList.add('pdf-mode');
    
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`CV_${(cvData.name || 'Sans_Nom').replace(/\s+/g, '_')}.pdf`);
    
    element.classList.remove('pdf-mode');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="text-brand-primary" />
          CV Builder
        </h2>
        <div className="flex gap-3">
          <button onClick={() => setIsEditing(!isEditing)} className="btn-secondary flex items-center gap-2">
            {isEditing ? <><Save size={18} /> Sauvegarder</> : <><Edit3 size={18} /> Éditer</>}
          </button>
          <button onClick={handleDownload} className="btn-primary flex items-center gap-2">
            <Download size={18} /> Télécharger PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Sidebar */}
        {isEditing && (
          <div className="glass-card space-y-6 lg:col-span-1 h-[80vh] overflow-y-auto">
            <h3 className="font-bold text-lg">Informations Personnelles</h3>
            <input className="input-field" value={cvData.name} onChange={e => setCvData({...cvData, name: e.target.value})} placeholder="Nom complet" />
            <input className="input-field" value={cvData.target_role} onChange={e => setCvData({...cvData, target_role: e.target.value})} placeholder="Titre du poste" />
            <textarea className="input-field min-h-[100px]" value={cvData.profile_summary} onChange={e => setCvData({...cvData, profile_summary: e.target.value})} placeholder="Résumé" />
            
            <h3 className="font-bold text-lg mt-6">Compétences</h3>
            <textarea className="input-field" value={cvData.skills.join(', ')} onChange={e => setCvData({...cvData, skills: e.target.value.split(',').map(s => s.trim())})} placeholder="Compétences (séparées par des virgules)" />
            
            {/* Add more editors for experience and education as needed */}
          </div>
        )}

        {/* CV Preview */}
        <div className={`glass-card p-0 overflow-hidden ${isEditing ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div id="cv-preview" className="bg-white text-slate-900 p-10 min-h-[842px] max-w-[794px] mx-auto shadow-sm">
            {/* Header */}
            <div className="border-b-2 border-slate-200 pb-6 mb-6">
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">{cvData.name}</h1>
              <h2 className="text-xl text-brand-primary font-medium mt-1">{cvData.target_role}</h2>
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-600">
                <span>{cvData.email}</span>
                <span>•</span>
                <span>{cvData.phone}</span>
                <span>•</span>
                <span>{cvData.location}</span>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-8">
              <p className="text-sm leading-relaxed text-slate-700">{cvData.profile_summary}</p>
            </div>

            <div className="grid grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="col-span-2 space-y-8">
                {/* Experience */}
                <section>
                  <h3 className="text-lg font-bold uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">Expérience Professionnelle</h3>
                  <div className="space-y-6">
                    {cvData.experiences.map((exp, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-bold text-slate-900">{exp.role}</h4>
                          <span className="text-xs text-slate-500 font-medium">{exp.period}</span>
                        </div>
                        <div className="text-sm text-brand-primary font-medium mb-2">{exp.company} | {exp.location}</div>
                        <ul className="list-disc pl-4 text-sm text-slate-700 space-y-1">
                          {(exp.description || []).map((desc, j) => <li key={j}>{desc}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Education */}
                <section>
                  <h3 className="text-lg font-bold uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">Formation</h3>
                  <div className="space-y-4">
                    {cvData.education.map((edu, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-bold text-slate-900">{edu.degree}</h4>
                          <span className="text-xs text-slate-500 font-medium">{edu.period}</span>
                        </div>
                        <div className="text-sm text-slate-700">{edu.school} | {edu.location}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                {/* Skills */}
                <section>
                  <h3 className="text-lg font-bold uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">Compétences</h3>
                  <div className="flex flex-wrap gap-2">
                    {cvData.skills.map((skill, i) => (
                      <span key={i} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium">{skill}</span>
                    ))}
                  </div>
                </section>

                {/* Languages */}
                <section>
                  <h3 className="text-lg font-bold uppercase tracking-wider border-b border-slate-200 pb-2 mb-4">Langues</h3>
                  <ul className="space-y-2">
                    {cvData.languages.map((lang, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary"></div>
                        {lang}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
