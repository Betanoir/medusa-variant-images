// import { Product, ProductVariant } from '@medusajs/medusa';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AdminProduct, AdminProductVariant } from '@medusajs/framework/types';
import { Button, FocusModal } from '@medusajs/ui';
import { nestedForm } from './utils/nestedForm';
import { prepareImages } from './utils/images';
import VariantsImagesMediaForm, { ImageType, MediaFormType } from './VariantsImagesMediaForm';
// import { sdk } from '../lib/config';
import { WidgetSettings } from '../widgets/VariantsImagesWidget';
import { fetchBackend, sortByTitle } from './utils/util';

export type FormImage = {
  url: string;
  name?: string;
  size?: number;
  nativeFile?: File;
};

type Notify = ((title: string, props?: { description?: React.ReactNode }) => string | number) & {
  error: (title: string, props?: { description?: React.ReactNode }) => string | number;
};

type Props = {
  product: AdminProduct;
  variant: AdminProductVariant;
  open: boolean;
  onClose: (_product?: AdminProduct) => void;
  type: 'thumbnail' | 'media';
  settings: WidgetSettings;
  notify: Notify;
};

type MediaFormWrapper = {
  media: MediaFormType;
};

const VariantsImagesModal = ({ variant, open, onClose, product, type, settings, notify }: Props) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const form = useForm<MediaFormWrapper>({
    defaultValues: getDefaultValues(product, variant, type),
  });
  const [imageArr, setImageArr] = useState<ImageType[]>([]); //! When removing an image, it resets to the default structure
  const [variants, setVariants] = useState<AdminProductVariant[] | AdminProductVariant>(variant);

  const {
    formState: { isDirty },
    handleSubmit,
    reset,
  } = form;

  useEffect(() => {
    reset(getDefaultValues(product, variant, type));
    setImageArr(
      getDefaultValues(product, variant, type)
        .media.images.filter((i) => i.info.selected)
        .sort((a, b) => a.info.selectedNumber - b.info.selectedNumber)
    );
  }, [reset, product, variant, type]);

  useEffect(() => {
    if (settings.baseOptionUpload.enabled) {
      const _variants = product.variants?.filter(
        (v) =>
          v.options?.find((o) => o.option_id === settings.baseOptionUpload.option)?.value ===
          variant.options?.find((o) => o.option_id === settings.baseOptionUpload.option)?.value
      );

      if (_variants?.length) setVariants(_variants);
    }
  }, []);

  const onReset = () => {
    reset(getDefaultValues(product, variant, type));
    onClose();
  };

  const onSubmit = handleSubmit(async (data: any) => {
    setIsUpdating(true);
    let preppedImages: FormImage[] = [];

    try {
      preppedImages = await prepareImages(data.media.images);
    } catch (error) {
      notify.error('Error', { description: 'Something went wrong while trying to upload images.' });
      console.error('Something went wrong while trying to upload images.');
      return;
    }

    const urls = preppedImages.map((image) => ({ url: image.url }));
    await fetchBackend(`/admin/products/${product.id}`, { body: { images: urls }, method: 'POST' });

    let updatedVariantList: AdminProductVariant[] | undefined;
    if (type === 'thumbnail') {
      const thumbnail = data.media.images.find((image: { info: { selected: any } }) => image.info.selected)?.url || null;

      if (Array.isArray(variants)) {
        await fetchBackend(`/admin/products/${product.id}/variants/batch`, {
          body: {
            update: variants.map((v) => ({
              id: v.id,
              metadata: { ...v.metadata, thumbnail },
            })),
          },
          method: 'POST',
        });

        updatedVariantList = await fetchBackend(`/admin/products/${product.id}/variants?order=title`).then((res) => res?.variants);
      } else
        updatedVariantList = await fetchBackend(`/admin/products/${product.id}/variants/${variants.id}`, {
          body: {
            metadata: {
              ...variants.metadata,
              thumbnail,
            },
          },
          method: 'POST',
        }).then((res) => res?.product?.variants?.sort?.(sortByTitle));
    } else {
      const images = data.media.images
        .map(({ info: { selected } }: { info: { selected: any } }, i: number) => selected && urls[i])
        .filter(Boolean)
        .sort((a: any, b: any) => imageArr.findIndex((i) => a.url === i.url) - imageArr.findIndex((i) => b.url === i.url));

      if (Array.isArray(variants)) {
        await fetchBackend(`/admin/products/${product.id}/variants/batch`, {
          body: {
            update: variants.map((v) => ({
              id: v.id,
              metadata: { ...v.metadata, images },
            })),
          },
          method: 'POST',
        });

        updatedVariantList = await fetchBackend(`/admin/products/${product.id}/variants?order=title`).then((res) => res?.variants);
      } else {
        updatedVariantList = await fetchBackend(`/admin/products/${product.id}/variants/${variants.id}`, {
          body: {
            metadata: {
              ...variants.metadata,
              images,
            },
          },
          method: 'POST',
        }).then((res) => res?.product?.variants?.sort?.(sortByTitle));
      }
    }

    onClose({ ...product, variants: updatedVariantList || null });
    setIsUpdating(false);
  });

  return (
    <FocusModal open={open} onOpenChange={onReset} modal>
      <FocusModal.Content aria-describedby={undefined} className=''>
        <FocusModal.Title asChild>
          <h2 className='sr-only'>Variant Images</h2>
        </FocusModal.Title>
        <FocusModal.Header>
          <Button variant='primary' type='submit' disabled={!isDirty} isLoading={isUpdating} form='variant-images-form'>
            Save and close
          </Button>
        </FocusModal.Header>
        <FocusModal.Body className='flex-1 min-h-0'>
          <form onSubmit={onSubmit} id='variant-images-form' className='h-full w-full'>
            <VariantsImagesMediaForm form={nestedForm(form, 'media')} type={type} setImageArr={setImageArr} imageArr={imageArr} />
          </form>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  );
};

const getDefaultValues = (product: AdminProduct, variant: AdminProductVariant, type: 'thumbnail' | 'media'): MediaFormWrapper => {
  const images =
    product?.images?.map((image) => {
      const isSelected =
        type === 'thumbnail'
          ? // @ts-ignore
            variant?.metadata?.thumbnail === image.url
          : // @ts-ignore
            variant?.metadata?.images?.some((vImage: any) => vImage.url === image.url) ?? false;

      const selectedNumber =
        type === 'media' &&
        // @ts-ignore
        variant?.metadata?.images?.findIndex((vImage: any) => vImage.url === image.url);

      return {
        url: image.url,
        info: {
          selectedNumber: (isSelected && selectedNumber + 1) || -1,
          selected: isSelected,
        },
      };
    }) || [];

  return {
    media: {
      images,
    },
  };
};

export default VariantsImagesModal;
