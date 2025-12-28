import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@shared/components/Modal';
import Button from '@shared/components/Button';
import { PropertyType, type PropertyItem } from '../types';
import { useState, useEffect } from 'react';

const editPropertySchema = z.object({
  type: z.string(),
  address: z.string().min(1, 'Address is required'),
  area: z.string().min(1, 'Area is required'),
  priceRange: z.string().min(1, 'Price range is required'),
  location: z.string().min(1, 'Location is required'),
  image: z.string().optional(),
});

type EditPropertyFormData = z.infer<typeof editPropertySchema>;

interface EditPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EditPropertyFormData) => void;
  property: PropertyItem | null;
}

export const EditPropertyModal = ({
  isOpen,
  onClose,
  onSubmit,
  property,
}: EditPropertyModalProps) => {
  const [imagePreview, setImagePreview] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditPropertyFormData>({
    resolver: zodResolver(editPropertySchema),
  });

  useEffect(() => {
    if (property) {
      reset({
        type: property.type,
        address: property.address,
        area: property.area,
        priceRange: property.priceRange,
        location: property.location,
        image: property.image || '',
      });
      setImagePreview(property.image || '');
    }
  }, [property, reset]);

  const handleFormSubmit = (data: EditPropertyFormData) => {
    onSubmit(data);
    onClose();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Property" size="lg">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Property Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Type
          </label>
          <select
            {...register('type')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(PropertyType).map(([key, value]) => (
              <option key={key} value={value}>
                {value}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            {...register('address')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter property address"
          />
          {errors.address && (
            <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
          )}
        </div>

        {/* Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Area
          </label>
          <input
            type="text"
            {...register('area')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 2-1-56 Rai"
          />
          {errors.area && (
            <p className="text-red-500 text-sm mt-1">{errors.area.message}</p>
          )}
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price Range
          </label>
          <input
            type="text"
            {...register('priceRange')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 38.0525 - 97.7786"
          />
          {errors.priceRange && (
            <p className="text-red-500 text-sm mt-1">{errors.priceRange.message}</p>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            {...register('location')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Nongbon, Prawet, Bangkok 10250"
          />
          {errors.location && (
            <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
          )}
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image (Optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {imagePreview && (
            <div className="mt-2">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-md"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
