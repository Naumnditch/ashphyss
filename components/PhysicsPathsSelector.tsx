"use client";
import { useState } from 'react';
import Link from 'next/link';

interface PhysicsPath {
  id: string;
  name: string;
  fullName: string;
  description: string;
  highlights: string[];
  subPaths?: SubPath[];
}

interface SubPath {
  id: string;
  name: string;
  fullName: string;
  description: string;
}

const physicsPaths: PhysicsPath[] = [
  {
    id: 'igcse',
    name: 'IGCSE',
    fullName: 'International General Certificate of Secondary Education',
    description: 'A globally recognized qualification that provides a solid foundation in physics for students aged 14-16.',
    highlights: [
      'Core physics concepts and principles',
      'Practical skills and laboratory work',
      'Preparation for A-levels and further study',
      'International curriculum standard'
    ]
  },
  {
    id: 'ib',
    name: 'IB',
    fullName: 'International Baccalaureate Physics',
    description: 'A comprehensive and challenging program that develops critical thinking and analytical skills in physics.',
    highlights: [
      'Higher Level (HL) and Standard Level (SL) options',
      'Theory of Knowledge integration',
      'Internal Assessment projects',
      'University-level preparation'
    ]
  },
  {
    id: 'ap',
    name: 'AP',
    fullName: 'Advanced Placement Physics',
    description: 'College-level physics courses that can earn university credit while still in high school.',
    highlights: [
      'Multiple course options available',
      'College-level curriculum in high school',
      'Opportunity to earn college credit',
      'Globally recognized by universities'
    ],
    subPaths: [
      {
        id: 'ap-physics-1',
        name: 'AP Physics 1',
        fullName: 'AP Physics 1: Algebra-Based',
        description: 'Covers Newtonian mechanics, work, energy, power, mechanical waves, and sound. Algebra-based approach suitable for first-time physics students.'
      },
      {
        id: 'ap-physics-2',
        name: 'AP Physics 2',
        fullName: 'AP Physics 2: Algebra-Based',
        description: 'Covers fluid mechanics, thermodynamics, electricity, magnetism, optics, and modern physics. Builds on AP Physics 1 concepts.'
      },
      {
        id: 'ap-physics-c',
        name: 'AP Physics C',
        fullName: 'AP Physics C: Calculus-Based',
        description: 'Advanced calculus-based course covering mechanics and/or electricity & magnetism. Designed for students with strong math background.'
      }
    ]
  },
  {
    id: 'hmh',
    name: 'HMH',
    fullName: 'Houghton Mifflin Harcourt Physics',
    description: 'A comprehensive physics curriculum designed to engage students through interactive learning and real-world applications.',
    highlights: [
      'Standards-aligned curriculum',
      'Interactive digital resources',
      'Real-world problem solving',
      'Comprehensive assessment tools'
    ]
  }
];

export function PhysicsPathsSelector() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedSubPath, setSelectedSubPath] = useState<string | null>(null);

  const handleTabClick = (pathId: string) => {
    setActiveTab(activeTab === pathId ? null : pathId);
    setSelectedSubPath(null); // Reset sub-path selection when changing main path
  };

  return (
    <section className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Choose Your Physics Path</h2>
        <p className="text-gray-600">Select the curriculum that matches your educational goals</p>
      </div>
      
      <div className="max-w-4xl mx-auto">
        {/* Horizontal Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {physicsPaths.map((path) => (
            <button
              key={path.id}
              onClick={() => handleTabClick(path.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === path.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
              }`}
            >
              {path.name}
            </button>
          ))}
        </div>

        {/* Dropdown Content */}
        {activeTab && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 space-y-4 animate-in slide-in-from-top-5 duration-300">
            {(() => {
              const activePath = physicsPaths.find(path => path.id === activeTab);
              if (!activePath) return null;
              
              return (
                <>
                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {activePath.fullName}
                    </h3>
                    <p className="text-gray-600">
                      {activePath.description}
                    </p>
                  </div>
                  
                  {/* Sub-paths for AP */}
                  {activePath.id === 'ap' && activePath.subPaths && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-teal-900">Choose Your AP Physics Course:</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {activePath.subPaths.map((subPath) => (
                          <button
                            key={subPath.id}
                            onClick={() => setSelectedSubPath(selectedSubPath === subPath.id ? null : subPath.id)}
                            className={`p-4 text-left border-2 rounded-lg transition-all duration-200 ${
                              selectedSubPath === subPath.id
                                ? 'border-teal-500 bg-teal-50'
                                : 'border-teal-200 hover:border-teal-400 hover:bg-teal-50'
                            }`}
                          >
                            <div className="font-medium text-teal-900 mb-1">{subPath.fullName}</div>
                            <div className="text-sm text-teal-700">{subPath.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Key Features for non-AP paths */}
                  {activePath.id !== 'ap' && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Key Features:</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {activePath.highlights.map((highlight, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span className="text-gray-700 text-sm">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Key Features for AP when sub-path is selected */}
                  {activePath.id === 'ap' && !selectedSubPath && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Key Features:</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {activePath.highlights.map((highlight, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            <span className="text-gray-700 text-sm">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Book Course Button */}
                      <Link
                        href={`/book?path=${activePath.id === 'ap' && selectedSubPath ? selectedSubPath : activePath.id}`}
                        className={`flex-1 inline-flex items-center justify-center px-6 py-3 font-medium rounded-lg transition-colors duration-200 ${
                          activePath.id === 'ap' && !selectedSubPath
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                        onClick={(e) => {
                          if (activePath.id === 'ap' && !selectedSubPath) {
                            e.preventDefault();
                          }
                        }}
                      >
                        Book {activePath.id === 'ap' && selectedSubPath 
                          ? activePath.subPaths?.find(sp => sp.id === selectedSubPath)?.name 
                          : activePath.name} Course
                      </Link>
                      
                      {/* Check Exam Dates Button */}
                      {activePath.id === 'ap' && (
                        <Link
                          href="/ap-exam-dates"
                          className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
                        >
                          Check Exam Dates
                        </Link>
                      )}
                      {activePath.id === 'igcse' && (
                        <Link
                          href="/igcse-exam-dates"
                          className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
                        >
                          Check Exam Dates
                        </Link>
                      )}
                      {activePath.id === 'ib' && (
                        <Link
                          href="/ib-exam-dates"
                          className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
                        >
                          Check Exam Dates
                        </Link>
                      )}
                    </div>
                    
                    {/* AP Selection Requirement Message */}
                    {activePath.id === 'ap' && !selectedSubPath && (
                      <p className="text-sm text-amber-600 mt-2 text-center">
                        Please select an AP Physics course above to continue
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </section>
  );
}
