export default function IBExamDatesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">IB Diploma Programme Exam Dates</h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          International Baccalaureate Diploma Programme examinations are held twice a year in May and November. 
          Access the official examination schedules for comprehensive planning.
        </p>
      </div>

      {/* Official IB Exam Schedules */}
      <div className="grid md:grid-cols-1 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-blue-900 mb-4">📅 Official IB Examination Schedules</h2>
          <p className="text-blue-700 mb-6">
            Download the complete examination timetables directly from the International Baccalaureate Organization (IBO).
          </p>
          
          <div className="grid md:grid-cols-3 gap-4">
            {/* November 2025 */}
            <div className="bg-white bg-opacity-70 p-4 rounded-lg">
              <div className="font-semibold text-blue-900 mb-2">November 2025 Examination Schedule</div>
              <p className="text-sm text-blue-700 mb-3">
                Complete examination schedule for the November 2025 examination schedule
              </p>
              <a 
                href="https://www.ibo.org/globalassets/new-structure/programmes/dp/pdfs/november-2025-exam-schedule.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm w-full justify-center"
              >
                <span>📄</span>
                Download November 2025
              </a>
            </div>

            {/* May 2026 */}
            <div className="bg-white bg-opacity-70 p-4 rounded-lg">
              <div className="font-semibold text-blue-900 mb-2">May 2026 Examination Schedule</div>
              <p className="text-sm text-blue-700 mb-3">
                Complete examination schedule for the May 2026 examination schedule
              </p>
              <a 
                href="https://www.ibo.org/globalassets/new-structure/programmes/dp/pdfs/may-2026-examination-schedule.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm w-full justify-center"
              >
                <span>📄</span>
                Download May 2026
              </a>
            </div>

            {/* November 2026 */}
            <div className="bg-white bg-opacity-70 p-4 rounded-lg">
              <div className="font-semibold text-blue-900 mb-2">November 2026 Examination Schedule</div>
              <p className="text-sm text-blue-700 mb-3">
                Complete examination schedule for the November 2026 examination schedule
              </p>
              <a 
                href="https://www.ibo.org/globalassets/new-structure/programmes/dp/pdfs/november-2026-examination-schedule.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm w-full justify-center"
              >
                <span>📄</span>
                Download November 2026
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Exam Sessions Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-green-900 mb-4">May Examination Schedule</h2>
          <div className="space-y-3 text-green-800">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div>
                <div className="font-medium">Examination Period</div>
                <div className="text-sm">Typically runs from late April to mid-May</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div>
                <div className="font-medium">Results Release</div>
                <div className="text-sm">Usually available in early July</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div>
                <div className="font-medium">Primary Session</div>
                <div className="text-sm">Most common session for IB students worldwide</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-orange-900 mb-4">November Examination Schedule</h2>
          <div className="space-y-3 text-orange-800">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
              <div>
                <div className="font-medium">Examination Period</div>
                <div className="text-sm">Typically runs from early to late November</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
              <div>
                <div className="font-medium">Results Release</div>
                <div className="text-sm">Usually available in early January</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
              <div>
                <div className="font-medium">Secondary Session</div>
                <div className="text-sm">Available for Southern Hemisphere schools</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IB Physics Specific Information */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-purple-900 mb-4">IB Physics Exam Information</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-purple-800 mb-3">Standard Level (SL) Physics</h3>
            <div className="space-y-2 text-purple-700">
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Paper 1: Multiple Choice</div>
                <div className="text-sm">45 minutes • 30 marks • 20% weighting</div>
              </div>
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Paper 2: Data-based & Short Answer</div>
                <div className="text-sm">1 hour 15 minutes • 50 marks • 40% weighting</div>
              </div>
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Paper 3: Long Answer Questions</div>
                <div className="text-sm">1 hour • 35 marks • 20% weighting</div>
              </div>
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Internal Assessment</div>
                <div className="text-sm">Individual Investigation • 20% weighting</div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-purple-800 mb-3">Higher Level (HL) Physics</h3>
            <div className="space-y-2 text-purple-700">
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Paper 1: Multiple Choice</div>
                <div className="text-sm">1 hour • 40 marks • 20% weighting</div>
              </div>
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Paper 2: Data-based & Short Answer</div>
                <div className="text-sm">2 hours 15 minutes • 95 marks • 36% weighting</div>
              </div>
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Paper 3: Long Answer Questions</div>
                <div className="text-sm">1 hour 15 minutes • 45 marks • 24% weighting</div>
              </div>
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Internal Assessment</div>
                <div className="text-sm">Individual Investigation • 20% weighting</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IB Physics Topics Overview */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-indigo-900 mb-4">IB Physics Curriculum Overview</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <h3 className="font-medium text-indigo-800 mb-3">Core Topics (SL & HL)</h3>
            <ul className="space-y-1 text-sm text-indigo-700">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Measurements and uncertainties</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Mechanics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Thermal physics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Waves</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Electricity and magnetism</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Circular motion and gravitation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Atomic, nuclear and particle physics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Energy production</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-indigo-800 mb-3">Additional HL Topics</h3>
            <ul className="space-y-1 text-sm text-indigo-700">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Wave phenomena</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Fields</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Electromagnetic induction</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Quantum and nuclear physics</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-indigo-800 mb-3">Option Topics</h3>
            <ul className="space-y-1 text-sm text-indigo-700">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Relativity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Engineering physics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Imaging</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600">•</span>
                <span>Astrophysics</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Important Dates and Deadlines */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-900 mb-4">📅 Important Deadlines</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-red-800 mb-3">Registration Deadlines</h3>
            <div className="space-y-2 text-sm text-red-700">
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">May Examination Schedule Registration</div>
                <div>Typically closes in January (check with your IB coordinator)</div>
              </div>
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">November Examination Schedule Registration</div>
                <div>Typically closes in September (check with your IB coordinator)</div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-red-800 mb-3">Internal Assessment Deadlines</h3>
            <div className="space-y-2 text-sm text-red-700">
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">IA Submission</div>
                <div>Set by individual schools, typically 2-3 months before exams</div>
              </div>
              <div className="bg-white bg-opacity-50 p-3 rounded">
                <div className="font-medium">Extended Essay</div>
                <div>Usually due in early March for May examination schedule</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preparation Timeline */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-yellow-900 mb-4">📚 IB Physics Preparation Timeline</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white bg-opacity-50 p-4 rounded">
            <div className="font-semibold text-yellow-800 mb-2">6 Months Before Exams</div>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Complete all core topics</li>
              <li>• Begin option topic study</li>
              <li>• Start Internal Assessment</li>
              <li>• Practice past paper questions</li>
            </ul>
          </div>
          <div className="bg-white bg-opacity-50 p-4 rounded">
            <div className="font-semibold text-yellow-800 mb-2">3 Months Before Exams</div>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Complete IA draft</li>
              <li>• Intensive revision of weak areas</li>
              <li>• Practice full past papers</li>
              <li>• Focus on data analysis skills</li>
            </ul>
          </div>
          <div className="bg-white bg-opacity-50 p-4 rounded">
            <div className="font-semibold text-yellow-800 mb-2">1 Month Before Exams</div>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Submit final IA</li>
              <li>• Complete timed practice papers</li>
              <li>• Review formula booklet</li>
              <li>• Focus on exam technique</li>
            </ul>
          </div>
        </div>
      </div>

      {/* IB Resources */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">📖 Official IB Resources</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-800 mb-3">Assessment Materials</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">📄</span>
                <span>Physics Subject Guide</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">📊</span>
                <span>Past examination papers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">📋</span>
                <span>Mark schemes and grade boundaries</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">📚</span>
                <span>Physics Data Booklet</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-800 mb-3">Support Services</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600">🎓</span>
                <span>IB Teacher Support Materials</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">💬</span>
                <span>IB Community forums</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">📞</span>
                <span>IB Programme support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">🌐</span>
                <span>ManageBac platform access</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Source Attribution */}
      <div className="text-center text-sm text-gray-500 border-t pt-4">
        <p>
          Official IB examination schedules sourced from the International Baccalaureate Organization (IBO):
        </p>
        <div className="mt-2 space-y-1">
          <div>
            <a 
              href="https://www.ibo.org/globalassets/new-structure/programmes/dp/pdfs/november-2025-exam-schedule.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-xs"
            >
              November 2025 Examination Schedule
            </a>
          </div>
          <div>
            <a 
              href="https://www.ibo.org/globalassets/new-structure/programmes/dp/pdfs/may-2026-examination-schedule.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-xs"
            >
              May 2026 Examination Schedule
            </a>
          </div>
          <div>
            <a 
              href="https://www.ibo.org/globalassets/new-structure/programmes/dp/pdfs/november-2026-examination-schedule.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-xs"
            >
              November 2026 Examination Schedule
            </a>
          </div>
        </div>
        <p className="mt-3 text-xs">
          For the most current examination schedules and specific dates, please consult your IB coordinator or the official IB website.
        </p>
      </div>
    </div>
  );
}
