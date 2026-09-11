import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "室内灯火 · Geo City 3D",
  description: "走进小屋，看一扇有厚度的窗和一盏暖光吊灯。",
};

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
