export default function ContactPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-gray-900">Contact</h1>
        <p className="text-gray-600 mt-2">Get in touch with your physics tutor</p>
      </div>
      
      {/* Business Card and Inquiry Form Section */}
      <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Business Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
              AE
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Abdelrahman Elashmawy</h2>
            <p className="text-gray-700 font-medium text-lg">M.Sc.</p>
            <p className="text-gray-600 text-sm mt-1">Physics Taught by an Engineer</p>
          </div>
          
          {/* Contact Information */}
          <div className="space-y-4">
            {/* Phone */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">P</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide">Phone/WhatsApp</p>
                <p className="text-gray-900 font-medium">+90 541 100 70 27</p>
              </div>
            </div>
            
            {/* Email */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">@</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide">Email</p>
                <p className="text-gray-900 font-medium">contact@ashphys.com</p>
              </div>
            </div>
            
            {/* Website */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">W</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide">Website</p>
                <p className="text-gray-900 font-medium">ashphys.org</p>
              </div>
            </div>
          </div>
          
          {/* Bottom Border */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
              IGCSE • IB • AP • HMH Physics
            </p>
          </div>
        </div>

        {/* Have Any Questions Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-3 text-center">Have Any Questions?</h3>
          <p className="text-gray-600 text-sm text-center mb-6">Feel free to ask about anything - curriculum, scheduling, pricing, or any other inquiry</p>
          
          <form className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">Grade/Level</label>
                <input 
                  type="text" 
                  id="grade" 
                  name="grade"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="e.g., Grade 11, IB Year 1"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email" 
                id="email" 
                name="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="your.email@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Your Question</label>
              <textarea 
                id="message" 
                name="message"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Ask me anything about physics tutoring, curriculum, scheduling, or any other questions you might have..."
              ></textarea>
            </div>
            
            <button 
              type="submit"
              className="w-full bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors duration-200"
            >
              Send Inquiry
            </button>
          </form>
        </div>
      </div>
      
      {/* Response Time */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 shadow-sm">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-green-400/50 shadow-md"></span>
          <p className="text-green-700 text-sm font-medium">I typically respond within an hour</p>
        </div>
      </div>

      {/* Ready to Start Learning CTA */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Ready to Start Learning?</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <a 
              href="/book" 
              className="bg-gray-900 text-white px-6 py-4 rounded-lg font-medium text-center hover:bg-gray-800 transition-colors duration-200 block text-lg"
            >
              Book a Session
            </a>
            <a 
              href="tel:+905411007027" 
              className="bg-white border border-gray-300 text-gray-900 px-6 py-4 rounded-lg font-medium text-center hover:bg-gray-50 transition-colors duration-200 block text-lg"
            >
              Call Now
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}


