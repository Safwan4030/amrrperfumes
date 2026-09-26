import React from 'react';
import { motion } from 'framer-motion';
import { Instagram } from 'lucide-react';
import khaelValleyImg from '../assets/images/amrr_khael_valley_bottle_1787897310058.jpg';
import kaahfImg from '../assets/images/amrr_kaahf_bottle_1787897329304.jpg';
import roseyOudImg from '../assets/images/amrr_rosey_oud_bottle_1787897346386.jpg';
import packagingImg from '../assets/images/amrr_luxury_set_1787897361370.jpg';

export const InstagramGallery: React.FC = () => {
  const posts = [
    { id: 1, image: khaelValleyImg, title: 'Khael Valley Eau de Parfum', likes: '14.2k' },
    { id: 2, image: kaahfImg, title: 'Kaahf Fresh Marine Signature', likes: '11.8k' },
    { id: 3, image: roseyOudImg, title: 'Rosey Oud Pure Extract', likes: '16.5k' },
    { id: 4, image: packagingImg, title: 'Artisanal Batch Presentation', likes: '19.3k' },
  ];

  return (
    <section className="py-20 bg-[#121613] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#536253]/30 border border-[#C8B282]/40 text-xs font-cinzel text-[#C8B282]">
            <Instagram className="w-3.5 h-3.5" />
            <span>@amrrperfumes_official</span>
          </div>
          <h2 className="font-cinzel text-3xl md:text-4xl font-bold tracking-tight">
            The Haute Flacon & Presentation
          </h2>
          <p className="text-sm text-gray-300 font-normal">
            Every AMRR Perfumes creation is hand-poured in our signature apothecary glass flacon with fluted black cap and minimalist kraft label.
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {posts.map((p) => (
            <motion.div
              key={p.id}
              whileHover={{ y: -8 }}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-[#536253]/40 bg-[#1B201C] shadow-2xl cursor-pointer"
            >
              <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
                <p className="font-playfair font-bold text-base text-white">{p.title}</p>
                <p className="text-xs text-[#C8B282] font-semibold mt-1">♥ {p.likes} Likes on Instagram</p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
