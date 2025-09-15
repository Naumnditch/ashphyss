export function Footer() {
  return (
    <footer className="border-t border-gray-200 mt-16">
      <div className="container-max py-8 text-sm text-gray-600 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} AshPhys. All rights reserved.</p>
        <p className="text-gray-500">Minimalist physics tutoring and resources.</p>
      </div>
    </footer>
  );
}


