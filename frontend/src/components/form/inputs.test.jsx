import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Checkbox, PercentInput } from './inputs';

function PercentHarness() {
  const [value, setValue] = useState('');
  return <PercentInput aria-label="Discount" value={value} onChange={setValue} />;
}

function CheckboxHarness({ disabled = false }) {
  const [checked, setChecked] = useState(false);
  return <Checkbox label="Show logo" checked={checked} disabled={disabled} onChange={setChecked} />;
}

describe('PercentInput', () => {
  it('lets only digits, one dot and two decimals through, and shows a % sign', async () => {
    const user = userEvent.setup();
    render(<PercentHarness />);
    const box = screen.getByLabelText('Discount');

    await user.type(box, 'a1b2.345');

    expect(box).toHaveValue('12.34');
    expect(screen.getByText('%')).toBeInTheDocument();
  });
});

describe('Checkbox', () => {
  it('toggles when the box or its label is clicked', async () => {
    const user = userEvent.setup();
    render(<CheckboxHarness />);
    const box = screen.getByLabelText('Show logo');

    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
    await user.click(screen.getByText('Show logo'));
    expect(box).not.toBeChecked();
  });

  it('does nothing while disabled', async () => {
    const user = userEvent.setup();
    render(<CheckboxHarness disabled />);
    const box = screen.getByLabelText('Show logo');

    await user.click(box);

    expect(box).toBeDisabled();
    expect(box).not.toBeChecked();
  });
});