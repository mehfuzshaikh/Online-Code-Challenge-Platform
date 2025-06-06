"use client";

import Slider from "react-slick";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import Image from "next/image";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const ALL_BADGES = [
  "joined_platform",
  "beginner_solver",
  "intermediate_solver",
  "advanced_solver",
  "expert_solver",
  "master_solver",
  "legendary_solver",
];

const BadgesCarousel = () => {
  const earnedBadges = useSelector((state: RootState) => state.auth.user?.badges || []);

  const settings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: true,
    responsive: [
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    // <div className="mt-6 bg-white p-6 rounded-xl shadow">
    <div className="w-full mt-6 bg-white p-6 rounded-xl shadow">
      <h2 className="text-lg font-semibold mb-4 text-gray-500">Badges</h2>
      {/* <Slider {...settings}>
        {badges.length === 0 ? (
          <div className="text-center text-gray-500 col-span-3">No badges earned yet</div>
        ) : (
          badges.map((badge: string, index: number) => (
            <div key={index} className="px-2">
              <div className="w-full h-32 flex items-center justify-center bg-gray-100 rounded-xl shadow-md">
                <Image
                  src={`/badges/${badge}.png`}
                  alt={`Badge ${index + 1}`}
                  width={100}
                  height={100}
                  className="object-contain"
                />
              </div>
            </div>
          ))
        )}
      </Slider> */}
      <Slider {...settings}>
        {ALL_BADGES.map((badge, index) => {
          const isEarned = earnedBadges.includes(badge);

          return (
            <div key={index} className="px-2">
              <div className="w-full h-32 relative flex items-center justify-center bg-gray-100 rounded-xl shadow-md">
                <Image
                  src={`/badges/${badge}.png`}
                  alt={`Badge ${index + 1}`}
                  width={100}
                  height={100}
                  className={`object-contain transition duration-300 ${
                    !isEarned ? "grayscale opacity-50" : ""
                  }`}
                />

                {!isEarned && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-sm text-gray-600 bg-white/80 px-2 py-1 rounded shadow">
                      Locked
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </Slider>
    </div>
  );
};

export default BadgesCarousel;
