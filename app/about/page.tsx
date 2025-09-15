export default function AboutPage() {
  return (
    <div className="prose max-w-none">
      <h1 className="text-3xl font-semibold mb-6 text-black">About AshPhys</h1>
      
      <blockquote className="border-l-4 border-blue-500 pl-6 italic text-lg text-black mb-6">
        "You realize when you know how to think, it empowers you far beyond those who know only what to think."
        <footer className="text-sm text-black mt-2">- Neil deGrasse Tyson</footer>
      </blockquote>
      
      <div className="space-y-4 text-black leading-relaxed">
        <p>
          This belief is the cornerstone of my teaching. While mastering a specific subject is our immediate goal, the true value of our sessions lies in building something far more permanent: your ability to learn independently.
        </p>
        
        <p>
          I don't just provide answers. I provide the tools—critical thinking, problem-solving frameworks, and research strategies—that empower you to find them yourself. My ultimate success is when you no longer need me because you have gained the confidence and skill to be your own best teacher.
        </p>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-3xl font-semibold text-black">
          Your success is measured by your independence.
        </p>
      </div>
      
      <div className="mt-6 text-center">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h2 className="text-lg font-semibold text-black mb-2">Ready to Start Your Learning Journey?</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a 
              href="/book" 
              className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors duration-200"
            >
              Book Your First Session
            </a>
            <a 
              href="/contact" 
              className="bg-white text-black border-2 border-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors duration-200"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


