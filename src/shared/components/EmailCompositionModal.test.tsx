import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import EmailCompositionModal from './EmailCompositionModal';

const base = {
  isOpen: true,
  onClose: vi.fn(),
  title: 'Compose',
  showCc: true,
  showBcc: true,
  showAttachments: true,
  onSubmit: vi.fn(),
};

describe('EmailCompositionModal labels', () => {
  it('renders the English defaults when no labels are passed', () => {
    render(<EmailCompositionModal {...base} />);

    for (const text of ['From', 'To', 'Cc', 'Bcc', 'Subject', 'Content', 'Attachments']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type and press Enter to add')).toBeInTheDocument();
  });

  it('renders the "Add attachment" default on the picker trigger', () => {
    render(<EmailCompositionModal {...base} attachmentPicker={{ quotationId: 'Q1' }} />);

    expect(screen.getByRole('button', { name: 'Add attachment' })).toBeInTheDocument();
  });

  it('renders the overrides, keeping the defaults of the labels not overridden', () => {
    render(
      <EmailCompositionModal
        {...base}
        subjectLabel="เรื่อง"
        labels={{
          from: 'จาก',
          send: 'ส่ง',
          cancel: 'ยกเลิก',
          to: 'ถึง',
          cc: 'สำเนา',
          attachmentPlaceholder: 'พิมพ์แล้วกด Enter',
        }}
      />,
    );

    expect(screen.getByText('จาก')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ส่ง' })).toBeInTheDocument();
    expect(screen.queryByText('From')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ยกเลิก' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(screen.getByText('ถึง')).toBeInTheDocument();
    expect(screen.getByText('สำเนา')).toBeInTheDocument();
    expect(screen.getByText('เรื่อง')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('พิมพ์แล้วกด Enter')).toBeInTheDocument();
    expect(screen.queryByText('To')).not.toBeInTheDocument();
    expect(screen.queryByText('Cc')).not.toBeInTheDocument();
    // not overridden -> English default stays
    expect(screen.getByText('Bcc')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Attachments')).toBeInTheDocument();
  });

  it('renders the overridden picker trigger caption', () => {
    render(
      <EmailCompositionModal
        {...base}
        attachmentPicker={{ quotationId: 'Q1' }}
        labels={{ addAttachment: 'แนบไฟล์' }}
      />,
    );

    expect(screen.getByRole('button', { name: 'แนบไฟล์' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add attachment' })).not.toBeInTheDocument();
  });
});

describe('EmailCompositionModal inside a page form', () => {
  it('submits its own form only, not the page form around it', async () => {
    const onSubmit = vi.fn();
    const pageSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { user } = render(
      <form onSubmit={pageSubmit}>
        <EmailCompositionModal
          {...base}
          showFrom={false}
          onSubmit={onSubmit}
          defaultValues={{
            from: 'bank@example.com',
            to: 'a@example.com',
            subject: 'Hello',
            content: 'Body',
          }}
        />
      </form>,
    );

    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(pageSubmit).not.toHaveBeenCalled();
  });
});
