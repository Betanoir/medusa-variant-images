import { useEffect, useState } from 'react';
import { Button, clx, DropdownMenu, Heading, Table, toast, Toaster, Tooltip, TooltipProvider } from '@medusajs/ui';
import { AdminProduct, AdminProductOption, AdminProductVariant, DetailWidgetProps } from '@medusajs/framework/types';
import { ArrowPath, EllipsisHorizontal, PencilSquare, ThumbnailBadge } from '@medusajs/icons';
import VariantsImagesModal from '../VariantImages/VariantsImagesModal';
import { defineWidgetConfig } from '@medusajs/admin-sdk';
import ViewImagesModal from '../VariantImages/ViewImagesModal';
import '../styles/globals.css';
import WidgetSettingsModal from '../VariantImages/WidgetSettingsModal';
// import { sdk } from '../lib/config';
import { fetchBackend, paginationInformation } from '../VariantImages/utils/util';
import { omit } from 'lodash-es';
import { useTimer } from '../VariantImages/hooks/useTimer';

export type VariantImage = {
  url: string | undefined;
};

type BaseOptionUpload = {
  enabled?: boolean;
  option?: string;
};

export type WidgetSettings = {
  baseOptionUpload: BaseOptionUpload;
};

type UpdateData = {
  variants?: boolean;
  options?: boolean;
  product?: boolean;
};

const VariantsImagesWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [openedVariant, setOpenedVariant] = useState<AdminProductVariant | null>(null);
  const [openedDialogType, setOpenedDialogType] = useState<'media' | 'thumbnail' | null>(null);

  const [settings, setSettings] = useState<WidgetSettings>({
    baseOptionUpload: { enabled: false },
  });
  const [options, setOptions] = useState<AdminProductOption[]>();
  const [product, setProduct] = useState<AdminProduct>(data);

  const updateData = async ({ variants = false, options = false, product: _product = false }: UpdateData) => {
    if (variants) {
      const limit = 50;

      async function fetchVariants(offset: number, accumulated: AdminProductVariant[]): Promise<AdminProductVariant[]> {
        const res = await fetchBackend(
          `/admin/products/${product.id}/variants?order=title&limit=${limit}&offset=${offset}`
        );
        if (!res) return accumulated;
        
        const { count, variants } = res;
        const newAccumulated = accumulated.concat(variants);
        
        if (offset + limit < count) {
          return await fetchVariants(offset + limit, newAccumulated);
        }
        
        return newAccumulated;
      }

      const allVariants = await fetchVariants(0, []);
      setProduct((prevProd) => ({ ...prevProd, variants: allVariants }));
    }

    if (options) {
      await fetchBackend(`/admin/products/${product.id}/options`).then((res) => {
        if (!res) return;

        setOptions(res.product_options);
      });
    }

    if (_product) {
      await fetchBackend(`/admin/products/${product.id}?fields=-variants`).then((res) => {
        if (!res) return;

        setProduct((prevProd) => ({ ...prevProd, ...res.product }));
      });
    }
  };

  const { fetching, timeLeft, restart } = useTimer({
    length: 6e4,
    onComplete: async () => await updateData({ options: true, product: true, variants: true }),
    recursive: true,
  });

  useEffect(() => {
    updateData({ options: true, variants: true });

    fetchBackend(`/admin/variant-images-settings/${product.id}`).then((res) => {
      if (!res) return;

      setSettings((_current) => ({
        ..._current,
        baseOptionUpload: {
          enabled: res.base_option_enabled,
          option: res.base_option_id || undefined,
        },
      }));
    });
  }, []);

  const handleClose = (_product?: AdminProduct) => {
    setOpenedVariant(null);
    setOpenedDialogType(null);

    if (_product) setProduct(_product);
  };

  const paginationOptions = paginationInformation(product.variants);
  const { currentVariants } = paginationOptions;

  return (
    <TooltipProvider>
      <Toaster />
      <div className='divide-y shadow-elevation-card-rest bg-ui-bg-base w-full rounded-lg divide-y p-0'>
        <div className='flex flex-row justify-between items-center px-6 py-4'>
          <Heading level='h1' className='flex items-center justify-between gap-x-4 '>
            <div>Variants Images</div>
          </Heading>

          <div className='flex flex-row gap-x-4'>
            <Tooltip content='Refresh'>
              <Button variant='transparent' onClick={() => restart()} className='h-7 p-1 flex flex-row gap-x-2 text-ui-fg-subtle'>
                <ArrowPath className={clx(fetching && 'animate-spin')} /> <span className='text-xs w-4'>{timeLeft}</span>
              </Button>
            </Tooltip>

            <WidgetSettingsModal settings={settings} setSettings={setSettings} product={product} options={options} />
          </div>
        </div>

        <div className='grid grid-cols-[repeat(auto-fill,minmax(225px,1fr))] gap-3 px-6 py-4'>
          {currentVariants?.map((variant) => {
            const variantImages: VariantImage[] | undefined = variant.metadata?.images as VariantImage[] | undefined;

            const variantThumbnail: string | undefined = variant.metadata?.thumbnail as string | undefined;

            return (
              <div key={variant.id} className='w-full p-3 bg-[rgba(45,45,49,1)] rounded-md flex flex-col'>
                <div className='flex items-center mb-3 bg-ui-bg-base rounded-full text-center relative py-[1.5px]'>
                  <div className='inter-base-semibold flex-1'>{variant.title}</div>
                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild>
                      <Button variant='transparent' className='rounded-full absolute right-0 top-0'>
                        <EllipsisHorizontal />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item
                        onClick={() => {
                          setOpenedVariant(variant);
                          setOpenedDialogType('thumbnail');
                        }}
                        className='gap-x-2'
                      >
                        <PencilSquare className='text-ui-fg-subtle' />
                        Edit Thumbnail
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => {
                          setOpenedVariant(variant);
                          setOpenedDialogType('media');
                        }}
                        className='gap-x-2'
                      >
                        <PencilSquare className='text-ui-fg-subtle' />
                        Edit Media
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                </div>
                <div className='grid grid-cols-2 grid-rows-2 items-center gap-3 h-full w-full'>
                  {variantThumbnail ? (
                    <div className='relative w-full h-full'>
                      <img src={variantThumbnail} alt='Thumbnail' className='object-cover bg-clip-border w-full h-full rounded-md aspect-square' />

                      <Tooltip content='Thumbnail'>
                        <ThumbnailBadge className='absolute top-2 left-2' />
                      </Tooltip>
                    </div>
                  ) : (
                    <div className='w-full h-full aspect-square break-words text-ui-fg-muted text-[14px] text-center border rounded-md border-ui-border-strong border-dashed p-[15%] flex justify-center items-center'>
                      No thumbnail
                    </div>
                  )}

                  {variantImages?.length
                    ? variantImages.length === 3
                      ? variantImages.map(
                          (
                            image: {
                              url: string | undefined;
                            },
                            i
                          ) => <Image image={image} key={i} />
                        )
                      : variantImages.slice(0, 3).map(
                          (
                            image: {
                              url: string | undefined;
                            },
                            i
                          ) => (
                            <div key={i} className='w-full h-full relative'>
                              <Image image={image} />

                              {i === 2 && <ViewImagesModal variantImages={variantImages} variantThumbnail={variantThumbnail} />}
                            </div>
                          )
                        )
                    : Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className='w-full h-full aspect-square break-words text-ui-fg-muted text-[14px] text-center border rounded-md border-ui-border-strong border-dashed p-[20%] flex justify-center items-center'
                        >
                          No images
                        </div>
                      ))}
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <Table.Pagination count={product.variants?.length || 0} {...omit(paginationOptions, 'currentVariants')} />
        </div>
      </div>

      {openedDialogType && (
        <VariantsImagesModal
          product={product}
          variant={openedVariant!}
          open={!!openedVariant}
          onClose={handleClose}
          type={openedDialogType}
          settings={settings}
          notify={toast}
        />
      )}
    </TooltipProvider>
  );
};

export const Image = ({ image }: { image: { url: string | undefined } }) => (
  <img src={image.url} alt='Uploaded image' className='object-cover aspect-square w-full h-full bg-clip-border rounded-md' />
);

export const config = defineWidgetConfig({
  zone: 'product.details.after',
});

export default VariantsImagesWidget;
