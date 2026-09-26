import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Heart, 
  User, 
  Search, 
  Menu, 
  X, 
  Compass
} from 'lucide-react';
import { Currency } from '../utils/helpers';
import { AmrrLogo } from './AmrrLogo';

interface NavbarProps {
  cartCount: number;
  wishlistCount: number;
  currency?: Currency;
  onCurrencyChange?: (c: Currency) => void;
  currentUser?: { email: string; name: string } | null;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenAccount: () => void;
  onOpenQuiz: () => void;
  onOpenSearch: () => void;
  onOpenAdmin: () => void;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  wishlistCount,
  currentUser,
  onOpenCart,
  onOpenWishlist,
  onOpenAccount,
  onOpenQuiz,
  onOpenSearch,
  onNavigate
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', id: 'hero' },
    { label: 'The AMRR Collection', id: 'collections' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 transition-all duration-300">
      {/* Clean Black & White Navbar */}
      <nav 
        className={`transition-all duration-200 ${
          isScrolled 
            ? 'bg-white/98 backdrop-blur-md py-3 shadow-sm text-black border-b border-gray-200' 
            : 'bg-white text-black py-4 border-b border-gray-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-black hover:text-gray-600 focus:outline-none cursor-pointer"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Brand Logo - AMRR */}
          <div 
            onClick={() => onNavigate('hero')}
            className="cursor-pointer group flex items-center transition-transform hover:opacity-85"
          >
            <AmrrLogo size="md" variant="dark" />
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-8 text-xs font-bold tracking-widest uppercase">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className="text-gray-800 hover:text-black transition-colors relative py-1 font-bold cursor-pointer"
              >
                {link.label}
              </button>
            ))}
            
            <button
              onClick={onOpenQuiz}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-black text-black hover:bg-black hover:text-white transition-all font-semibold text-[11px] tracking-wider cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              Scent Finder
            </button>
          </div>

          {/* Right Header Icons */}
          <div className="flex items-center space-x-1 sm:space-x-2">

            {/* Search Icon */}
            <button
              onClick={onOpenSearch}
              className="p-2 text-black hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 cursor-pointer"
              title="Search Fragrances"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist Icon */}
            <button
              onClick={onOpenWishlist}
              className="p-2 text-black hover:text-gray-600 transition-colors relative rounded-full hover:bg-gray-100 cursor-pointer"
              title="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 bg-black text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Account Icon */}
            <button
              onClick={onOpenAccount}
              className="p-1.5 sm:p-2 text-black hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 cursor-pointer flex items-center gap-1.5 relative"
              title={currentUser ? `Signed in as ${currentUser.email} (Customer Profile)` : "Customer Profile"}
            >
              <div className="relative">
                <User className="w-5 h-5" />
                {currentUser && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
                )}
              </div>
              {currentUser && (
                <span className="text-[11px] font-bold text-black hidden lg:inline max-w-[85px] truncate">
                  {currentUser.name ? currentUser.name.split(' ')[0] : 'Profile'}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="flex items-center gap-2 bg-black text-white px-3.5 sm:px-4 py-2 rounded-full font-sans font-semibold text-xs tracking-wider hover:bg-gray-800 transition-all shadow-sm cursor-pointer ml-1"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Bag</span>
              <span className="bg-white text-black text-[10px] px-2 py-0.5 rounded-full font-bold">
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white text-black border-t border-gray-200 px-6 py-6 space-y-4 shadow-lg">
            <div className="flex flex-col space-y-3 font-sans text-sm tracking-widest uppercase">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => {
                    onNavigate(link.id);
                    setMobileMenuOpen(false);
                  }}
                  className="text-left py-2 border-b border-gray-100 font-semibold hover:text-black cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => {
                  onOpenQuiz();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-black text-white rounded-xl font-bold mt-2 cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                Scent Finder
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
