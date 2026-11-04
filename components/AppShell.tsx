"use client";

import React, { useState } from "react";
import Navbar from "./Navbar";
import Feed from "./Feed";
import SidebarInfo from "./SidebarInfo";
import CreatePostModal from "./CreatePostModal";
import { useAnonUser } from "@/hooks/useAnonUser";
import { PostDTO } from "@/app/actions/getPosts";

interface AppShellProps {
  initialPosts: PostDTO[];
}

export function AppShell({ initialPosts }: AppShellProps) {
  const userSession = useAnonUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [posts, setPosts] = useState<PostDTO[]>(initialPosts);

  const handlePostCreated = (newPost: PostDTO) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors selection:bg-[#6C1C74]/20 selection:text-[#6C1C74]">
      {/* Top Navbar */}
      <Navbar
        userSession={userSession}
        onOpenCreateModal={() => setIsModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Feed Column (8 cols on desktop) */}
          <section className="lg:col-span-8 w-full min-w-0">
            <Feed
              initialPosts={posts}
              userSession={userSession}
              onOpenCreateModal={() => setIsModalOpen(true)}
            />
          </section>

          {/* Right Sidebar Column (4 cols on desktop) - Sticky Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-20 self-start space-y-4">
            <SidebarInfo />
          </aside>
        </div>
      </main>

      {/* Floating Create Post Modal */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userSession={userSession}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}

export default AppShell;
