import React from 'react';
import { Icons } from './Icons';

const Footer: React.FC = () => {
  return (
    <footer className="mt-20">
      <div className="w-full h-32 bg-brand-200 bg-opacity-60 rounded-t-[2.5rem] mx-auto px-4 sm:px-6 lg:px-8 flex items-center max-w-[1200px] mb-4">
        <div className="pl-8">
           <div className="w-10 h-10 rounded-full border-2 border-brand-700 flex items-center justify-center text-brand-700 font-bold text-xl">
              <span className="relative top-[1px]">In</span>
            </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;