import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import ConfirmDialog from '../../src/components/ConfirmDialog.jsx';
import ConsentDialog from '../../src/components/tryOn/ConsentDialog.jsx';

// jsdom chưa cài showModal/close cho <dialog>: giả lập tối thiểu (hành vi thật đã bấm thử trên Chrome).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal() {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function close() {
    this.removeAttribute('open');
  });
});
afterEach(() => vi.clearAllMocks());

const dialogEl = () => document.querySelector('dialog');

function renderConfirm(props = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <ConfirmDialog
      open
      title="Xoá sản phẩm?"
      description="Xoá sản phẩm “A”?"
      confirmLabel="Xoá sản phẩm"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel, ...view };
}

describe('ConfirmDialog (xoá sản phẩm admin)', () => {
  it('mở bằng showModal, có tên/mô tả truy cập được; đóng khi open=false', () => {
    const { rerender } = renderConfirm();
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: 'Xoá sản phẩm?' })).toHaveAccessibleDescription(
      'Xoá sản phẩm “A”?',
    );
    rerender(
      <ConfirmDialog
        open={false}
        title="Xoá sản phẩm?"
        description="d"
        confirmLabel="Xoá sản phẩm"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1);
  });

  it('Huỷ và xác nhận gọi đúng callback', async () => {
    const { onConfirm, onCancel } = renderConfirm();
    await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Xoá sản phẩm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Esc (sự kiện cancel) huỷ default và gọi onCancel; bị chặn khi busy', () => {
    const { onCancel, rerender } = renderConfirm();
    const event = new Event('cancel', { cancelable: true });
    dialogEl().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(
      <ConfirmDialog
        open
        busy
        title="t"
        description="d"
        confirmLabel="Xoá sản phẩm"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    dialogEl().dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('bấm nền (chính <dialog>) đóng, bấm nội dung thì không; busy chặn cả hai', () => {
    const { onCancel, rerender } = renderConfirm();
    fireEvent.click(screen.getByRole('heading', { name: 'Xoá sản phẩm?' }));
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.click(dialogEl());
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(
      <ConfirmDialog
        open
        busy
        title="t"
        description="d"
        confirmLabel="Xoá sản phẩm"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(dialogEl());
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Đang xoá…' })).toBeDisabled();
  });

  it('hiển thị lỗi bằng role=alert', () => {
    renderConfirm({ error: 'Không xoá được' });
    expect(screen.getByRole('alert')).toHaveTextContent('Không xoá được');
  });
});

describe('ConsentDialog (phòng thử đồ)', () => {
  it('"Đồng ý" -> onAgree; "Để sau", Esc và bấm nền -> onLater', async () => {
    const onAgree = vi.fn();
    const onLater = vi.fn();
    render(<ConsentDialog open onAgree={onAgree} onLater={onLater} />);
    expect(screen.getByRole('dialog', { name: 'Cho phép xử lý ảnh của bạn?' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Đồng ý' }));
    expect(onAgree).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Để sau' }));
    dialogEl().dispatchEvent(new Event('cancel', { cancelable: true }));
    fireEvent.click(dialogEl());
    expect(onLater).toHaveBeenCalledTimes(3);
  });

  it('busy: nhãn "Đang lưu…", không đóng được; lỗi hiện role=alert', () => {
    const onLater = vi.fn();
    render(<ConsentDialog open busy error="Lỗi lưu" onAgree={() => {}} onLater={onLater} />);
    expect(screen.getByRole('button', { name: 'Đang lưu…' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Lỗi lưu');
    dialogEl().dispatchEvent(new Event('cancel', { cancelable: true }));
    fireEvent.click(dialogEl());
    expect(onLater).not.toHaveBeenCalled();
  });
});
