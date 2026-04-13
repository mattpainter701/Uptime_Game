import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { HUD } from '../HUD';
import { useGameStore } from '../../../store/gameStore';

// Mock sub-components that have complex dependencies
vi.mock('../UptimeClock', () => ({
  UptimeClockMini: () => <div data-testid="uptime-clock-mini">Uptime</div>,
}));

vi.mock('../TicketTimer', () => ({
  TicketTimerMini: () => <div data-testid="ticket-timer-mini">Timer</div>,
}));

vi.mock('../InventoryPanel', () => ({
  InventoryMini: () => <div data-testid="inventory-mini">Inventory</div>,
}));

describe('HUD', () => {
  beforeEach(() => {
    useGameStore.setState({
      player: {
        id: 'player-1',
        name: 'NetAdmin',
        level: 1,
        title: 'Help Desk Tech',
        floor: 5,
        credits: 500,
        reputation: 10,
        xp: 200,
        xpToNextLevel: 300,
      },
      currentView: 'office',
      activeTicket: null,
      currentFloor: 'basement',
      playerPosition: {
        x: 0,
        y: 0,
        z: -1,
        rotation: 0,
        pose: 'seated',
        isMoving: false,
      },
      uptime: {
        sessionId: null,
        isTracking: false,
        startedAt: null,
        nodes: {},
        totalUptimeSeconds: 0,
        totalDowntimeSeconds: 0,
        uptimePercentage: 100,
        pointsEarned: 0,
        totalIncidents: 0,
      },
    });
  });

  it('renders player name and title', () => {
    render(<HUD />);
    expect(screen.getByText('NetAdmin')).toBeInTheDocument();
    expect(screen.getByText('Help Desk Tech')).toBeInTheDocument();
  });

  it('renders player credits', () => {
    render(<HUD />);
    expect(screen.getByText('$500')).toBeInTheDocument();
  });

  it('renders player level', () => {
    render(<HUD />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<HUD />);
    expect(screen.getByTitle('Office')).toBeInTheDocument();
    expect(screen.getByTitle('Tickets')).toBeInTheDocument();
    expect(screen.getByTitle('Terminal')).toBeInTheDocument();
    expect(screen.getByTitle('Shop')).toBeInTheDocument();
    expect(screen.getByTitle('Settings')).toBeInTheDocument();
  });

  it('switches view when navigation button clicked', async () => {
    const user = userEvent.setup();
    render(<HUD />);
    await user.click(screen.getByTitle('Shop'));
    expect(useGameStore.getState().currentView).toBe('shop');
  });

  it('does not show active ticket bar when no ticket is active', () => {
    render(<HUD />);
    expect(screen.queryByText('Open Terminal')).not.toBeInTheDocument();
    expect(screen.queryByText('Abandon')).not.toBeInTheDocument();
  });

  it('shows active ticket bar when a ticket is active', () => {
    useGameStore.setState({
      activeTicket: {
        id: 'NET-001',
        title: 'Fix DHCP',
        description: 'Fix the DHCP issue',
        category: 'network-basics',
        difficulty: 1,
        timeLimit: 10,
        rewardCredits: 100,
        rewardXp: 50,
        labTemplate: 'test',
        hints: [],
        validation: [],
        status: 'active',
        startedAt: Date.now(),
      },
    });
    render(<HUD />);
    expect(screen.getByText('Fix DHCP')).toBeInTheDocument();
    expect(screen.getByText('NET-001')).toBeInTheDocument();
    expect(screen.getByText('Open Terminal')).toBeInTheDocument();
    expect(screen.getByText('Abandon')).toBeInTheDocument();
  });

  it('shows movement controls when in office view', () => {
    render(<HUD />);
    // When seated, should show SPACE to Stand Up
    expect(screen.getByText('Stand Up')).toBeInTheDocument();
  });

  it('shows uptime as inactive when not tracking', () => {
    render(<HUD />);
    expect(screen.getByText('--.--%')).toBeInTheDocument();
  });

  it('shows reputation', () => {
    render(<HUD />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
