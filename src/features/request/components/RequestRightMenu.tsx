import ProfileCard from '@/shared/components/ProfileCard';
import SectionHeader from '../../../shared/components/sections/SectionHeader';
import Tabs from '@/shared/components/sections/Tabs';

interface RequestRightMenuProps {}

const RequestRightMenu = ({}: RequestRightMenuProps) => {
  return (
    <div>
      <Tabs>
        <Tabs.List>
          <Tabs.Tab>Overview</Tabs.Tab>
          <Tabs.Tab>Comments</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panels>
          <Tabs.Panel className="flex flex-col gap-4">
            <SectionHeader title="Requestor" />
            <ProfileCard
              avatar={
                <img
                  alt=""
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  className="rounded-full"
                />
              }
              label={'ME'}
              description={'Reacher Doe'}
            />
            <SectionHeader title="Creator" />
            <ProfileCard
              avatar={
                <img
                  alt=""
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  className="rounded-full"
                />
              }
              label={'ME'}
              description={'Reacher Doe'}
            />
          </Tabs.Panel>
          <Tabs.Panel>Comment</Tabs.Panel>
        </Tabs.Panels>
      </Tabs>
    </div>
  );
};

export default RequestRightMenu;
