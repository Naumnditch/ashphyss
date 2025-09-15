"use client";
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookingCalendar } from './BookingCalendar';
import { BookSessionForm } from './BookSessionForm';
import { CustomTimingSelector } from './CustomTimingSelector';
import { useBooking } from './BookingContext';

interface SubPath {
  id: string;
  name: string;
  fullName: string;
  description: string;
}

interface PhysicsPathData {
  id: string;
  name: string;
  fullName: string;
  description: string;
  subPaths?: SubPath[];
}

const physicsPathNames: Record<string, string> = {
  'igcse': 'IGCSE',
  'ib': 'IB',
  'ap': 'AP',
  'ap-physics-1': 'AP Physics 1',
  'ap-physics-2': 'AP Physics 2',
  'ap-physics-c': 'AP Physics C',
  'hmh': 'HMH'
};

const physicsPathsData = [
  {
    id: 'igcse',
    name: 'IGCSE',
    fullName: 'International General Certificate of Secondary Education',
    description: 'A globally recognized qualification that provides a solid foundation in physics for students aged 14-16.'
  },
  {
    id: 'ib',
    name: 'IB',
    fullName: 'International Baccalaureate Physics',
    description: 'A comprehensive and challenging program that develops critical thinking and analytical skills in physics.'
  },
  {
    id: 'ap',
    name: 'AP',
    fullName: 'Advanced Placement Physics',
    description: 'College-level physics courses that can earn university credit while still in high school.',
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
    description: 'A comprehensive physics curriculum designed to engage students through interactive learning and real-world applications.'
  }
];

export function BookingPageContent() {
  const searchParams = useSearchParams();
  const pathId = searchParams.get('path');
  const pathName = pathId ? physicsPathNames[pathId] : null;
  const { sessionsPerWeek, setSessionsPerWeek } = useBooking();
  
  // Local state for path selection when no path is specified in URL
  const [selectedPath, setSelectedPath] = useState<string | null>(pathName);
  const [selectedSubPath, setSelectedSubPath] = useState<string | null>(null);
  
  // Check if the pathId is an AP sub-path and handle accordingly
  const isAPSubPath = pathId && ['ap-physics-1', 'ap-physics-2', 'ap-physics-c'].includes(pathId);
  if (isAPSubPath && selectedPath !== 'ap') {
    setSelectedPath('ap');
    setSelectedSubPath(pathId);
  }

  const currentPathName = selectedPath ? physicsPathNames[selectedPath] : null;
  const title = currentPathName 
    ? `Book a tutoring course on ${currentPathName}` 
    : 'Book a tutoring course';

  const totalSessions = sessionsPerWeek === 2 ? 8 : 12;

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold mb-4">{title}</h1>
        
                       {/* Physics Path Selector (shown when no path is specified) */}
               {!selectedPath && (
                 <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
                   <div className="text-center mb-4">
                     <h3 className="text-xl font-bold text-teal-900 mb-1">Choose Your Physics Path</h3>
                     <p className="text-teal-700 text-sm">Select the curriculum that matches your educational goals</p>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {physicsPathsData.map((path) => (
                       <button
                         key={path.id}
                         onClick={() => {
                           setSelectedPath(path.id);
                           setSelectedSubPath(null);
                         }}
                         className="group p-4 bg-white border-2 border-teal-200 rounded-lg hover:border-teal-400 hover:shadow-md transition-all duration-200 text-left"
                       >
                         <div className="flex items-center justify-between mb-2">
                           <div className="text-lg font-bold text-teal-900 bg-teal-100 px-2 py-1 rounded">{path.name}</div>
                           <div className="text-teal-400 group-hover:text-teal-600 transition-colors">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                             </svg>
                           </div>
                         </div>
                         <div className="text-sm font-semibold text-teal-800 mb-1">{path.fullName}</div>
                         <div className="text-xs text-teal-600 leading-relaxed">{path.description}</div>
                         <div className="mt-3 text-xs text-teal-500 font-medium">
                           Click to Select →
                         </div>
                       </button>
                     ))}
                   </div>
                 </div>
               )}
        
        {/* AP Sub-path Selection */}
        {selectedPath === 'ap' && (
          <div className="space-y-3">
            <h4 className="font-medium text-teal-900">Choose Your AP Physics Course:</h4>
            <div className="grid grid-cols-1 gap-3">
              {physicsPathsData.find(p => p.id === 'ap')?.subPaths?.map((subPath) => (
                <button
                  key={subPath.id}
                  onClick={() => setSelectedSubPath(selectedSubPath === subPath.id ? null : subPath.id)}
                  className={`p-3 text-left border-2 rounded-lg transition-all duration-200 ${
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

        {/* Selected Path Display and Change Option */}
        {selectedPath && (selectedPath !== 'ap' || selectedSubPath) && (
          <div className="mb-4 p-3 bg-teal-50 rounded-lg border border-teal-200 flex justify-between items-center">
            <div>
              <span className="text-sm text-teal-700">Selected Course: </span>
              <span className="font-medium text-teal-900">
                {selectedPath === 'ap' && selectedSubPath 
                  ? physicsPathsData.find(p => p.id === 'ap')?.subPaths?.find(sp => sp.id === selectedSubPath)?.fullName
                  : physicsPathsData.find(p => p.id === selectedPath)?.fullName
                }
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedPath(null);
                setSelectedSubPath(null);
              }}
              className="text-xs text-teal-600 hover:text-teal-800 underline"
            >
              Change Course
            </button>
          </div>
        )}

        {/* Session Frequency Selector */}
        {selectedPath && (selectedPath !== 'ap' || selectedSubPath) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Course Frequency</h3>
            <div className="flex gap-4">
              <button
                onClick={() => setSessionsPerWeek(2)}
                className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                  sessionsPerWeek === 2
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                }`}
              >
                <div className="text-center">
                  <div className="font-medium">2 Sessions/Week</div>
                  <div className="text-sm opacity-75">8 sessions total</div>
                </div>
              </button>
              <button
                onClick={() => setSessionsPerWeek(3)}
                className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                  sessionsPerWeek === 3
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                }`}
              >
                <div className="text-center">
                  <div className="font-medium">3 Sessions/Week</div>
                  <div className="text-sm opacity-75">12 sessions total</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {selectedPath && (selectedPath !== 'ap' || selectedSubPath) && <BookingCalendar />}
        {selectedPath && (selectedPath !== 'ap' || selectedSubPath) && <CustomTimingSelector />}
        {selectedPath && (selectedPath !== 'ap' || selectedSubPath) && (
          <p className="text-xs text-gray-500 mt-4">Available Monday–Friday: 6:00 PM – 10:00 PM, Saturday: 3:00 PM – 10:00 PM</p>
        )}
      </div>
      {selectedPath && (selectedPath !== 'ap' || selectedSubPath) && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
          <BookSessionForm selectedPath={
            selectedPath === 'ap' && selectedSubPath 
              ? physicsPathNames[selectedSubPath]
              : currentPathName
          } />
        </div>
      )}
    </div>
  );
}
