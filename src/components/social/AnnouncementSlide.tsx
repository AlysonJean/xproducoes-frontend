import React from 'react';
import { SocialAnnouncement } from '../../services/socialService';

interface AnnouncementSlideProps {
    announcement: SocialAnnouncement;
}

export const AnnouncementSlide: React.FC<AnnouncementSlideProps> = ({ announcement }) => {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in">
            <div className="max-w-4xl w-full text-center space-y-8 p-12 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 blur-3xl rounded-full opacity-50 animate-pulse"></div>

                <div className="relative z-10 space-y-6">
                    <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 tracking-tight uppercase drop-shadow-2xl">
                        {announcement.title}
                    </h2>
                    
                    <div className="w-32 h-2 bg-gradient-to-r from-pink-500 to-violet-500 mx-auto rounded-full"></div>

                    <p className="text-4xl text-white font-medium leading-relaxed drop-shadow-lg max-w-2xl mx-auto">
                        {announcement.message}
                    </p>
                </div>
            </div>
        </div>
    );
};
