import React from 'react';
import BasicInfo from '@/components/mainProfile/BasicInfo';
import SolvedProblemsStats from '@/components/mainProfile/SolvedProblemsStats';
import ProfileStatsCards from '@/components/mainProfile/ProfileStatsCards';
import BadgesCarousel from '@/components/mainProfile/BadgesCarousel';
import SubmissionHeatmap from '@/components/mainProfile/SubmissionHeatmap';
import ProtectedUserRoute from '@/components/shared/ProtectedUserRoute';

const ProfilePage = () => {
  return (
    <ProtectedUserRoute>
      <div className="min-h-screen bg-gray-100 py-10 px-4 sm:px-6 lg:px-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="w-full lg:w-1/3">
              <BasicInfo />
            </div>

            <div className="w-full lg:w-2/3 flex flex-col gap-0">
              <SolvedProblemsStats />
              <ProfileStatsCards />
              <BadgesCarousel />
            </div>
          </div>
          <SubmissionHeatmap/>
        </div>
      </div>
    </ProtectedUserRoute>
  );
};

export default ProfilePage;
