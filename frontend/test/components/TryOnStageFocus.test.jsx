import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import TryOnStage from '../../src/components/tryOn/TryOnStage.jsx';

const PRODUCTS = ['a', 'b', 'c'].map((id) => ({
  id,
  name: `SP ${id}`,
  price: 1000,
  imageUrl: `https://img.test/${id}.png`,
}));

/** Mô phỏng TryOnRoom: onKeyDown ←/→ nằm trên vùng bao ngoài, như trang thật. */
function Harness() {
  const [index, setIndex] = useState(0);
  const goNext = () => setIndex((i) => Math.min(i + 1, PRODUCTS.length - 1));
  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));
  function handleKeyDown(event) {
    if (event.key === 'ArrowRight') goNext();
    else if (event.key === 'ArrowLeft') goPrev();
  }
  return (
    <MemoryRouter>
      <section aria-label="phòng" onKeyDown={handleKeyDown}>
        <p data-testid="pos">{PRODUCTS[index].id}</p>
        <TryOnStage
          product={PRODUCTS[index]}
          entry={{ kind: 'quota', startedAt: 0 }}
          avatarUrl={null}
          canPrev={index > 0}
          canNext={index < PRODUCTS.length - 1}
          onPrev={goPrev}
          onNext={goNext}
          onRetry={() => {}}
          onImageError={() => {}}
          swipe={{}}
        />
      </section>
    </MemoryRouter>
  );
}

describe('TryOnStage: focus khi nút mũi tên bị disabled', () => {
  it('bấm tới cuối -> focus về khung ảnh -> ArrowLeft lùi được', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const next = screen.getByRole('button', { name: 'Sản phẩm tiếp theo' });
    await user.click(next);
    expect(screen.getByTestId('pos')).toHaveTextContent('b');
    expect(next).toHaveFocus();
    await user.click(next);
    expect(screen.getByTestId('pos')).toHaveTextContent('c');
    expect(next).toBeDisabled();
    const frame = screen.getByRole('group', { name: /Ảnh thử đồ/ });
    expect(frame).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByTestId('pos')).toHaveTextContent('b');
  });

  it('về đầu danh sách bằng nút "trước" -> focus về khung ảnh -> ArrowRight đi tiếp được', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab(); // khung ảnh
    await user.keyboard('{ArrowRight}');
    expect(screen.getByTestId('pos')).toHaveTextContent('b');
    const prev = screen.getByRole('button', { name: 'Sản phẩm trước' });
    await user.click(prev);
    expect(screen.getByTestId('pos')).toHaveTextContent('a');
    expect(prev).toBeDisabled();
    expect(screen.getByRole('group', { name: /Ảnh thử đồ/ })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByTestId('pos')).toHaveTextContent('b');
  });

  it('nút không giữ focus thì focus không bị cướp khỏi khung ảnh', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    const frame = screen.getByRole('group', { name: /Ảnh thử đồ/ });
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByTestId('pos')).toHaveTextContent('c');
    expect(frame).toHaveFocus();
  });
});
