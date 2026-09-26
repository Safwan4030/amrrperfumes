import React from 'react';
import { Sparkles, Award, FlaskConical, ShieldCheck } from 'lucide-react';

export const BrandStory: React.FC = () => {
  return (
    <section id="story" className="py-20 bg-white text-black border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black text-white text-xs font-bold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Craftsmanship & Philosophy</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-bold text-black leading-tight">
          &quot;They will remember you<br />
          <span className="font-serif italic font-normal text-gray-600">before they remember your name.&quot;</span>
        </h2>

        <p className="text-base text-gray-700 font-normal leading-relaxed max-w-2xl mx-auto">
          At AMRR Perfumes, we believe fragrance is the most intimate form of memory. Handcrafted in small artisanal batches with pure Eau de Parfum concentration and premium essences, our creations are formulated to project with refined elegance all day and night.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left max-w-3xl mx-auto">
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 text-black font-bold text-xs uppercase tracking-wider">
              <Award className="w-4 h-4" />
              Eau de Parfum Power
            </div>
            <p className="text-xs text-gray-600 font-normal">
              18+ hours persistent longevity with distinct top, heart, and base transformations.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 text-black font-bold text-xs uppercase tracking-wider">
              <FlaskConical className="w-4 h-4" />
              Pure Concentrates
            </div>
            <p className="text-xs text-gray-600 font-normal">
              Premium essences blended with sustainably harvested amber, oud, and fine florals.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 text-black font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Complimentary Tester
            </div>
            <p className="text-xs text-gray-600 font-normal">
              Complimentary 5ml tester vial included with every full-size bottle order.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};


