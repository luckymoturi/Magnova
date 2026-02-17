import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import MaintenanceImage from '../assets/Maintenance.png';

export const MaintenancePage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      setSubscribed(true);
      setTimeout(() => {
        setEmail('');
        setSubscribed(false);
      }, 3000);
    }
  };

return (
    <div className="min-h-screen bg-gradient-to-br from-gray-500 via-gray-400 to-gray-300 flex relative overflow-hidden">
        {/* Decorative Clouds */}
        <div className="absolute top-10 left-20 w-32 h-16 bg-white/60 rounded-full blur-sm"></div>
        <div className="absolute top-20 right-32 w-40 h-20 bg-white/50 rounded-full blur-sm"></div>
        <div className="absolute bottom-32 left-40 w-36 h-18 bg-white/60 rounded-full blur-sm"></div>
        <div className="absolute top-40 right-20 w-28 h-14 bg-white/40 rounded-full blur-sm"></div>

        {/* Full page split layout */}
        <div className="w-full h-screen flex flex-col md:flex-row">
            {/* Left Half - Image */}
            <div className="w-full md:w-1/2 bg-white flex items-center justify-center">
                <img 
                    src={MaintenanceImage}
                    alt="Under Maintenance"
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Right Half - Content */}
            <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-8 md:p-16">
                <div className="max-w-xl w-full">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-4">
                        We are Under Maintenance
                    </h1>
                    <p className="text-xl md:text-2xl text-blue-600 mb-10 font-medium">
                        see you soon!
                    </p>

                    {/* Email Subscription Form */}
                    <form onSubmit={handleSubscribe} className="mb-8">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                                <input
                                    type="email"
                                    placeholder="Enter your E-mail address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 border-2 border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 transition-colors text-neutral-700 text-base"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-8 py-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg whitespace-nowrap"
                            >
                                Subscribe
                            </button>
                        </div>
                        {subscribed && (
                            <p className="mt-3 text-sm text-neutral-600 font-medium">
                                ✓ Thank you! We'll notify you when we're back.
                            </p>
                        )}
                    </form>

                    <p className="text-base text-neutral-600 mb-8">
                        This feature is currently being improved. We'll notify you once it's ready!
                    </p>

                    {/* Back Button */}
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Go Back
                    </button>

                    {/* Footer Text */}
                    <p className="mt-12 text-sm text-neutral-500">
                        Thank you for your patience and understanding.
                    </p>
                </div>
            </div>
        </div>
    </div>
);
};
