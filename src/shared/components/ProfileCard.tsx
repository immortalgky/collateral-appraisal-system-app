import type { HTMLAttributes, ReactNode } from 'react';

interface ProfileCardProps extends HTMLAttributes<HTMLDivElement> {
  avatar: ReactNode;
  label: string;
  description: string;
}

const ProfileCard = ({ avatar, label, description, ...props }: ProfileCardProps) => {
  return (
    <div className={`flex items-center gap-3 ${props.className}`}>
      <div className="size-8 bg-gray-50 rounded-full">{avatar}</div>
      <div className="flex flex-col gap-0">
        <div className="text-accent font-medium">{label}</div>
        <div className="text-xs text-neutral-7">{description}</div>
      </div>
    </div>
  );
};

export default ProfileCard;
