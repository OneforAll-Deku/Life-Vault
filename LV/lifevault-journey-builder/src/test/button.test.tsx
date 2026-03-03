import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import React from 'react';

describe('Button Component', () => {
    it('renders correctly with text', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('applies default variant classes', () => {
        render(<Button>Default</Button>);
        const button = screen.getByRole('button', { name: /default/i });
        expect(button.className).toContain('bg-primary');
    });

    it('applies destructive variant classes', () => {
        render(<Button variant="destructive">Delete</Button>);
        const button = screen.getByRole('button', { name: /delete/i });
        expect(button.className).toContain('bg-destructive');
    });
});
