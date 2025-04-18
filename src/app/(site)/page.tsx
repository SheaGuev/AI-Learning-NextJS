import TitleSection from '@/components/landing-page/title-section';
import { Button } from '@/components/ui/button';
import React, { useState } from 'react';
import Link from 'next/link';

const HomePage = () => {
  return (
    <>
      <section
        className=" overflow-hidden
      px-4
      sm:px-6
      mt-10
      sm:flex
      sm:flex-col
      gap-4
      md:justify-center
      md:items-center"
      >
        <TitleSection
          pill="✨ Your Learning, Streamlined"
          title="All-In-One AI-Powered Learning Platform"
        />


        <div
          className="bg-black
          p-[25px]
          mt-6
          rounded-xl
          bg-gradient-to-l
          from-neutral-800
          to-brand-primaryBlue
          sm:w-[300px]
          flex
          justify-center
          gap-5
        "
        > 
        

        <Link href={'/login'}>
          <Button
            variant="secondary"
            className="sm:block whitespace-nowrap"
          >
            Login
          </Button>
        </Link>
        <Link href="/signup">
          <Button
            variant="default"
            className="whitespace-nowrap"
          >
            Sign Up
          </Button>
        </Link>
        
        </div>

        
        
      </section>
    </>
  );
};

export default HomePage;