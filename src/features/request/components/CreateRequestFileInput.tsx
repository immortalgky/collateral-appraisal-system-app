import Icon from '@/shared/components/Icon';
import FileInput from '@/shared/components/inputs/FileInput';
import clsx from 'clsx';
import { useUploadDocument } from '../api';

const CreateRequestFileInput = () => {
  const { mutate } = useUploadDocument();
  // TODO: (Wait for more info)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      console.log(e.target.files);
    }
    if (!e.target.files?.length) {
      return;
    }
    mutate(e.target.files);
  };
  return (
    <FileInput onChange={handleChange}>
      <div className={clsx('w-full', 'border-2', 'border-dashed', 'border-slate-200', 'p-10')}>
        <div className={clsx('flex', 'flex-col', 'gap-5', 'items-center', 'justify-center')}>
          <Icon style="solid" name="folder-open" className="text-6xl" />
          <p>Drag and drop your files here or choose files</p>
        </div>
      </div>
    </FileInput>
  );
};

export default CreateRequestFileInput;
