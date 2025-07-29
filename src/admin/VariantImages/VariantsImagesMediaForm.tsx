import { Controller, FieldArrayWithId, useFieldArray } from 'react-hook-form';
import { NestedForm } from './utils/nestedForm';
import { FormImage } from './utils/images';
import FileUploadField from './components/FileUploadField';
import { CheckCircleSolid, CircleDottedLine } from '@medusajs/icons';
import { clx } from '@medusajs/ui';
import { useRef } from 'react';

export type ImageType = {
  info: { selectedNumber: number; selected: boolean };
} & FormImage;

export type MediaFormType = {
  images: ImageType[];
};

type Props = {
  form: NestedForm<MediaFormType>;
  type: 'thumbnail' | 'media';
  setImageArr: React.Dispatch<React.SetStateAction<ImageType[]>>;
  imageArr: ImageType[];
};

const VariantsImagesMediaForm = ({ form, type, setImageArr, imageArr }: Props) => {
  const { control, path, setValue } = form;

  const singleSelection = type === 'thumbnail';
  const { fields, append } = useFieldArray({
    control: control,
    name: path('images'),
  });

  const prevSelectedImage = useRef<number | undefined>(fields?.findIndex((field) => field.info.selected));

  const handleFilesChosen = (files: File[]) => {
    if (files.length) {
      const toAppend = files.map((file) => ({
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        nativeFile: file,
        info: {
          selected: false,
          selectedNumber: -1,
        },
      }));

      append(toAppend);
    }
  };

  const handleImageSelected = (index: number) => {
    if (prevSelectedImage.current !== undefined && singleSelection) {
      setValue(path(`images.${prevSelectedImage.current}.info`), {
        selected: false,
        selectedNumber: -1,
      });
    }
    prevSelectedImage.current = index;
  };

  return (
    <div className='flex size-full flex-col-reverse lg:grid lg:grid-cols-[1fr_560px]'>
      {fields.length > 0 ? (
        <div className='bg-ui-bg-subtle size-full min-h-0 divide-y flex flex-col'>
          <div className='p-6 flex flex-col h-fit space-y-1'>
            <h2>Uploads</h2>
            <p className='txt-small text-ui-fg-subtle'>
              {type === 'thumbnail' ? <span>Select an image to use as the variant thumbnail.</span> : <span>Select images to use as the variant images.</span>}
            </p>
          </div>
          {/* Scrollable grid container */}
          <div className='p-6 flex-1 h-full overflow-y-auto'>
            <div className='grid auto-rows-auto grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-6'>
              {fields.map((field, index) => {
                return (
                  <Image
                    key={field.id}
                    image={field}
                    index={index}
                    form={form}
                    onSelected={handleImageSelected}
                    setImageArr={setImageArr}
                    imageArr={imageArr}
                    type={type}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className='w-[70%]'></div>
      )}

      <div className='bg-ui-bg-base h-fit border-b px-6 py-4 lg:border-b-0 lg:border-l'>
        <div className='flex flex-col gap-y-2'>
          <div className='flex flex-col gap-y-1'>
            <h2>Media</h2>
            <p className='txt-small text-ui-fg-subtle'>Add images to your product media.</p>
          </div>

          <div>
            <FileUploadField
              onFileChosen={handleFilesChosen}
              placeholder='Drag and drop images, or click to upload.'
              multiple
              filetypes={['image/gif', 'image/jpeg', 'image/png', 'image/webp']}
              className='py-large'
            />
          </div>
        </div>
      </div>
    </div>
  );
};

type ImageProps = {
  image: FieldArrayWithId<MediaFormType, 'images', 'id'>;
  index: number;
  form: NestedForm<MediaFormType>;
  onSelected: (index: number) => void;
  setImageArr: React.Dispatch<React.SetStateAction<ImageType[]>>;
  imageArr: ImageType[];
  type: 'media' | 'thumbnail';
};

const Image = ({ image, index, form, onSelected, setImageArr, imageArr, type }: ImageProps) => {
  const { control, path } = form;

  return (
    <Controller
      name={path(`images.${index}.info`)}
      control={control}
      render={({ field: { value, onChange } }) => {
        let selectedNumber: number | boolean = false;
        if (value.selected) selectedNumber = imageArr.findIndex((i) => i.url === image.url) + 1;

        return (
          <button
            className={clx(
              'relative shadow-elevation-card-rest hover:shadow-elevation-card-hover focus-visible:shadow-borders-focus bg-ui-bg-subtle-hover group aspect-square h-auto max-w-full overflow-hidden rounded-lg outline-none',
              {
                'bg-grey-500': value.selected,
              }
            )}
            type='button'
            onClick={() => {
              onChange({
                selectedNumber: -1,
                selected: !value.selected,
              });

              if (!value.selected) {
                onSelected(index);
                setImageArr((prevArr) => prevArr?.concat(image));
              } else setImageArr((prevArr) => prevArr?.filter((i) => i.url !== image.url));
            }}
          >
            <img
              src={image.url}
              alt={image.name || 'Uploaded image'}
              className={clx('rounded-lg object-cover bg-clip-border w-full h-full duration-300 brightness-100', {
                'brightness-50': value.selected,
              })}
            />

            <span
              className={clx('hidden group-hover:block absolute top-2 right-2 mix-blend-difference', {
                'block mix-blend-normal': value.selected,
                'bg-neutral-950 flex rounded-full group-hover:flex flex-row items-center w-10 h-[19px] px-0.5': value.selected && type === 'media',
              })}
            >
              {value.selected ? (
                <>
                  <CheckCircleSolid className='text-green-300' />
                  {type === 'media' && <span className='text-xs text-white font-bold ml-1.5 mt-px'>{selectedNumber}</span>}
                </>
              ) : (
                <CircleDottedLine />
              )}
            </span>
          </button>
        );
      }}
    />
  );
};

export default VariantsImagesMediaForm;
