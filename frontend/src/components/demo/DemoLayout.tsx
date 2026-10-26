import { DemoIdentitySwitcher } from '@/components/DemoIdentitySwitcher';
import { Button, Container, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const destinations = [
  { to: '/demo/browse', label: 'Browse' },
  { to: '/demo/give', label: 'Give an item' },
  { to: '/demo/activity', label: 'My activity' },
  { to: '/demo/impact', label: 'Impact' },
];

export const DemoLayout = ({ children }: { children?: ReactNode }) => (
  <Container size="lg" py="md">
    <Stack gap="lg">
      <Paper withBorder radius="lg" p="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="lg">
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Pass It On · Local Demo
            </Text>
            <Title order={1} size="h2" mt={4}>
              Free things, ready for a new home
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              A fictional, local-only giveaway flow.
            </Text>
          </div>
          <DemoIdentitySwitcher />
        </Group>
        <Group component="nav" aria-label="Demo navigation" mt="md" gap="xs" wrap="wrap">
          {destinations.map(destination => (
            <Button
              key={destination.to}
              component={NavLink}
              to={destination.to}
              variant="light"
              size="sm"
            >
              {destination.label}
            </Button>
          ))}
        </Group>
      </Paper>
      {children ?? <Outlet />}
    </Stack>
  </Container>
);
