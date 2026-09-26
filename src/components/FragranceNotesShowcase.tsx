import React, { useState } from 'react';
import { Sparkles, Clock } from 'lucide-react';

export const FragranceNotesShowcase: React.FC = () => {
  const [activeNote, setActiveNote] = useState<'top' | 'heart' | 'base'>('top');

  const noteData = {
    top: {
      title: 'Top Notes (Opening)',
      duration: 'First 0 - 30 Minutes',
      description: 'The immediate sensory opening of the fragrance. Fresh, volatile essences like citrus, bergamot, spices, and pepper pods that create the initial impression.',
      ingredients: ['Wild Sage', 'Italian Bergamot', 'Pink Pepper Pods', 'Cardamom', 'Juniper Berry']
    },
    heart: {
      title: 'Heart Notes (Middle Notes)',
      duration: '2 Hours - 6 Hours',
      description: 'The true soul and core identity of the perfume. Rich florals, aromatic woods, and spices that linger gracefully through the day.',
      ingredients: ['French Lavender', 'Cedarwood', 'Rose Petals', 'Iris Root', 'Incense']
    },
    base: {
      title: 'Base Notes (Dry Down)',
      duration: '6 Hours - 18+ Hours',
      description: 'The heavy, deep foundation that binds to skin and fabrics. Aged agarwood oud, amber, musk, and vanilla delivering long-lasting sillage.',
      ingredients: ['Rich Oud', 'Amber', 'Cashmere Wood', 'Vetiver', 'Bourbon Vanilla']
    }
  };

  return (
    <section id="notes-section" className="py-20 bg-white text-black border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-500">
            Perfumery Architecture
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-black">
            The Olfactory Pyramid
          </h2>
          <p className="text-sm text-gray-600 font-normal leading-relaxed">
            Every AMRR fragrance evolves across three distinct aromatic tiers.
          </p>
        </div>

        {/* Interactive Pyramids Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Note Buttons */}
          <div className="lg:col-span-4 flex flex-col space-y-3">
            {[
              { id: 'top', label: '1. Top Notes', sub: 'Instant Impression' },
              { id: 'heart', label: '2. Heart Notes', sub: 'The Core Body' },
              { id: 'base', label: '3. Base Notes', sub: 'Signature Dry Down' },
            ].map((nt) => (
              <button
                key={nt.id}
                onClick={() => setActiveNote(nt.id as any)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                  activeNote === nt.id
                    ? 'bg-black text-white border-black shadow-md'
                    : 'bg-gray-50 text-black border-gray-200 hover:border-black'
                }`}
              >
                <p className="font-bold text-lg">{nt.label}</p>
                <p className={`text-xs mt-1 ${activeNote === nt.id ? 'text-gray-300' : 'text-gray-500'}`}>{nt.sub}</p>
              </button>
            ))}
          </div>

          {/* Active Note Description Card */}
          <div className="lg:col-span-8 p-8 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <h3 className="text-2xl font-bold text-black">{noteData[activeNote].title}</h3>
                <p className="text-xs text-gray-600 font-semibold tracking-wider mt-1 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Duration: {noteData[activeNote].duration}</span>
                </p>
              </div>

              <Sparkles className="w-5 h-5 text-black" />
            </div>

            <p className="text-sm leading-relaxed text-gray-700 font-normal">
              {noteData[activeNote].description}
            </p>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                Key Notes:
              </p>

              <div className="flex flex-wrap gap-2">
                {noteData[activeNote].ingredients.map((ing, idx) => (
                  <span
                    key={idx}
                    className="px-3.5 py-1.5 bg-white border border-gray-300 rounded-full text-xs font-semibold text-black"
                  >
                    • {ing}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
