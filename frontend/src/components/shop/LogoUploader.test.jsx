import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import { shopApi } from '../../api/endpoints';
import { ToastProvider } from '../ui/Toast';
import LogoUploader from './LogoUploader';

vi.mock('../../api/endpoints', () => ({
  shopApi: {
    uploadLogo: vi.fn(),
    removeLogo: vi.fn(),
    logoUrl: (version = 0) => `/api/shop-profile/logo?v=${version}`,
  },
}));

beforeEach(() => {
  shopApi.uploadLogo.mockReset();
  shopApi.removeLogo.mockReset();
});

function setup(props = {}) {
  const onChanged = vi.fn();
  render(
    <ToastProvider>
      <LogoUploader hasLogo={false} shopName="Chirag Auto Parts" onChanged={onChanged} {...props} />
    </ToastProvider>,
  );
  return { user: userEvent.setup(), onChanged };
}

const picture = (name = 'logo.png') => new File(['x'], name, { type: 'image/png' });

describe('LogoUploader', () => {
  it('shows the first letter of the shop name and only an Upload button when there is no logo', () => {
    setup();

    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Shop logo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('shows the logo with Change and Remove buttons when there is a logo', () => {
    setup({ hasLogo: true });

    expect(screen.getByRole('img', { name: 'Shop logo' })).toHaveAttribute('src', '/api/shop-profile/logo?v=0');
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('uploads the chosen file, tells the page and changes the image address', async () => {
    shopApi.uploadLogo.mockResolvedValue({});
    const { user, onChanged } = setup({ hasLogo: true });
    const file = picture();

    await user.upload(screen.getByLabelText('Logo file'), file);

    await waitFor(() => expect(shopApi.uploadLogo).toHaveBeenCalledWith(file));
    expect(await screen.findByText('Logo saved.')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('img', { name: 'Shop logo' })).toHaveAttribute('src', '/api/shop-profile/logo?v=1');
  });

  it('shows the backend message under the box when the file is refused', async () => {
    shopApi.uploadLogo.mockRejectedValue(new ApiError({
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'Please correct the highlighted fields.',
      fieldErrors: [{ field: 'file', message: 'Only PNG or JPEG images are accepted.' }],
    }));
    const { user, onChanged } = setup();

    await user.upload(screen.getByLabelText('Logo file'), picture('notes.png'));

    expect(await screen.findByText('Only PNG or JPEG images are accepted.')).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('asks before removing the logo, keeps it on Cancel and removes it on confirm', async () => {
    shopApi.removeLogo.mockResolvedValue(null);
    const { user, onChanged } = setup({ hasLogo: true });

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(await screen.findByRole('dialog', { name: 'Remove the shop logo?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(shopApi.removeLogo).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(await screen.findByRole('button', { name: 'Remove logo' }));
    await waitFor(() => expect(shopApi.removeLogo).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Logo removed.')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});