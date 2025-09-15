export default function IGCSEExamDatesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Cambridge IGCSE Exam Dates</h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Cambridge IGCSE examinations are held twice a year - in the May/June and October/November sessions. 
          Plan your studies and preparation with the official exam timetable for Zone 3 (Turkey).
        </p>
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 max-w-2xl mx-auto">
          <p className="text-blue-800 text-sm">
            <span className="font-medium">Turkey Administrative Zone:</span> Zone 3 - 
            Check the official November 2025 timetable for exact dates and times.
          </p>
        </div>
      </div>

      {/* Zone 3 Official Timetable */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-indigo-900 mb-4">📅 Official Zone 3 (Turkey) Exam Timetable</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-indigo-800 mb-3">November 2025 Session</h3>
            <div className="space-y-3">
              <div className="bg-white bg-opacity-70 p-4 rounded-lg">
                <div className="font-medium text-indigo-900 mb-2">Official PDF Timetable</div>
                <p className="text-sm text-indigo-700 mb-3">
                  Download the complete November 2025 examination timetable for Zone 3 (Turkey) 
                  with exact dates, times, and paper codes.
                </p>
                <a 
                  href="https://www.cambridgeinternational.org/Images/732804-november-2025-zone-3-timetable.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                  <span>📄</span>
                  Download Zone 3 Timetable
                </a>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-indigo-800 mb-3">Zone 3 Coverage</h3>
            <div className="space-y-2">
              <div className="bg-white bg-opacity-70 p-3 rounded">
                <div className="font-medium text-indigo-900">Turkey</div>
                <div className="text-sm text-indigo-700">Primary administrative zone</div>
              </div>
              <div className="bg-white bg-opacity-70 p-3 rounded">
                <div className="font-medium text-indigo-900">Time Zone</div>
                <div className="text-sm text-indigo-700">Turkey Time (TRT) - UTC+3</div>
              </div>
              <div className="bg-white bg-opacity-70 p-3 rounded">
                <div className="font-medium text-indigo-900">Exam Period</div>
                <div className="text-sm text-indigo-700">October - November 2025</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Information */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">May/June Session</h2>
          <div className="space-y-3 text-blue-800">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <div className="font-medium">Examination Period</div>
                <div className="text-sm">Typically runs from early May to mid-June</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <div className="font-medium">Results Release</div>
                <div className="text-sm">Usually available in mid-August</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <div className="font-medium">Entry Deadline</div>
                <div className="text-sm">Check with your school - typically February/March</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-green-900 mb-4">October/November Session</h2>
          <div className="space-y-3 text-green-800">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div>
                <div className="font-medium">Examination Period</div>
                <div className="text-sm">Typically runs from mid-October to late November</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div>
                <div className="font-medium">Results Release</div>
                <div className="text-sm">Usually available in mid-January</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div>
                <div className="font-medium">Entry Deadline</div>
                <div className="text-sm">Check with your school - typically August/September</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Physics Specific Information */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-purple-900 mb-4">IGCSE Physics (0625) Exam Information</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-purple-800 mb-3">Paper Structure</h3>
            <div className="space-y-2 text-purple-700">
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Paper 1: Multiple Choice</div>
                <div className="text-sm">45 minutes • 40 marks • 30% weighting</div>
              </div>
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Paper 2: Theory (Core)</div>
                <div className="text-sm">1 hour 15 minutes • 80 marks • 50% weighting</div>
              </div>
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Paper 4: Theory (Extended)</div>
                <div className="text-sm">1 hour 15 minutes • 80 marks • 50% weighting</div>
              </div>
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Paper 6: Practical</div>
                <div className="text-sm">1 hour • 40 marks • 20% weighting</div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-purple-800 mb-3">Grade Boundaries</h3>
            <div className="space-y-2 text-purple-700 text-sm">
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Core Curriculum (Grades C-G)</div>
                <div>Papers 1, 2, and 6</div>
              </div>
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Extended Curriculum (Grades A*-G)</div>
                <div>Papers 1, 4, and 6</div>
              </div>
              <div className="mt-3 p-3 bg-purple-100 rounded">
                <div className="font-medium text-purple-900">Important Note:</div>
                <div className="text-xs">Students must take either the Core or Extended route. Extended curriculum covers additional topics and allows access to grades A*-C.</div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Exam Timetable Information */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-indigo-600 text-white px-6 py-4">
          <h2 className="text-2xl font-semibold">General IGCSE Physics Exam Schedule Pattern</h2>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-indigo-900 mb-4">May/June Session</h3>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-400 pl-4">
                  <div className="font-medium text-gray-900">Week 1-2 (Early May)</div>
                  <div className="text-sm text-gray-600">Paper 1 (Multiple Choice) typically scheduled</div>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <div className="font-medium text-gray-900">Week 3-4 (Mid May)</div>
                  <div className="text-sm text-gray-600">Paper 2 (Core) or Paper 4 (Extended) Theory</div>
                </div>
                <div className="border-l-4 border-blue-400 pl-4">
                  <div className="font-medium text-gray-900">Week 5-6 (Late May/Early June)</div>
                  <div className="text-sm text-gray-600">Paper 6 (Practical) examinations</div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-indigo-900 mb-4">October/November Session</h3>
              <div className="space-y-3">
                <div className="border-l-4 border-green-400 pl-4">
                  <div className="font-medium text-gray-900">Week 1-2 (Mid October)</div>
                  <div className="text-sm text-gray-600">Paper 1 (Multiple Choice) typically scheduled</div>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <div className="font-medium text-gray-900">Week 3-4 (Late October)</div>
                  <div className="text-sm text-gray-600">Paper 2 (Core) or Paper 4 (Extended) Theory</div>
                </div>
                <div className="border-l-4 border-green-400 pl-4">
                  <div className="font-medium text-gray-900">Week 5-6 (November)</div>
                  <div className="text-sm text-gray-600">Paper 6 (Practical) examinations</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Important Preparation Tips */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-yellow-900 mb-4">📚 Exam Preparation Timeline</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-50 p-4 rounded">
            <div className="font-semibold text-yellow-800 mb-2">6 Months Before</div>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Complete syllabus coverage</li>
              <li>• Start past paper practice</li>
              <li>• Identify weak areas</li>
            </ul>
          </div>
          <div className="bg-white bg-opacity-50 p-4 rounded">
            <div className="font-semibold text-yellow-800 mb-2">3 Months Before</div>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Intensive revision sessions</li>
              <li>• Practice practical skills</li>
              <li>• Focus on exam technique</li>
            </ul>
          </div>
          <div className="bg-white bg-opacity-50 p-4 rounded">
            <div className="font-semibold text-yellow-800 mb-2">1 Month Before</div>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Final revision</li>
              <li>• Timed practice papers</li>
              <li>• Review exam requirements</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Cambridge International Resources */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">📖 Official Cambridge Resources</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-800 mb-3">Available Resources</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">📄</span>
                <span>Past examination papers and mark schemes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">📊</span>
                <span>Examiner reports with performance analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">📋</span>
                <span>Specimen papers for new syllabuses</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">📚</span>
                <span>Endorsed textbooks and digital resources</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 mb-3">Support Services</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600">🎓</span>
                <span>Professional development for teachers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">💬</span>
                <span>Subject discussion forums</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">📞</span>
                <span>Customer support for schools</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">🌐</span>
                <span>Online learning platform access</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-blue-600 text-white rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Need Specific Exam Dates?</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-blue-100 mb-3">
              Exact exam dates vary by region and are published by Cambridge International 
              approximately 12 months in advance.
            </p>
            <p className="text-blue-100">
              Contact your school's exams officer for specific dates and entry deadlines.
            </p>
          </div>
          <div className="space-y-2">
            <div className="bg-blue-700 bg-opacity-50 p-3 rounded">
              <div className="font-medium">School Exams Officer</div>
              <div className="text-sm text-blue-100">Your first point of contact for exam entries</div>
            </div>
            <div className="bg-blue-700 bg-opacity-50 p-3 rounded">
              <div className="font-medium">Cambridge International</div>
              <div className="text-sm text-blue-100">Official exam timetables and updates</div>
            </div>
          </div>
        </div>
      </div>

      {/* Source Attribution */}
      <div className="text-center text-sm text-gray-500 border-t pt-4">
        <p>
          Information based on Cambridge International Education guidelines from{' '}
          <a 
            href="https://www.cambridgeinternational.org/exam-administration/cambridge-exams-officers-guide/phase-1-preparation/timetabling-exams/exam-timetables/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Cambridge International Exam Administration Guide
          </a>
        </p>
        <p className="mt-2">
          Zone 3 (Turkey) specific timetable:{' '}
          <a 
            href="https://www.cambridgeinternational.org/Images/732804-november-2025-zone-3-timetable.pdf" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            November 2025 Zone 3 Official Timetable PDF
          </a>
        </p>
        <p className="mt-2 text-xs">
          For the most current and region-specific exam dates, please consult your school or the official Cambridge International website.
        </p>
      </div>
    </div>
  );
}
