import { authAPI } from '@/services/custom/auth';
import { passItOnDemoAPI } from '@/services/custom/passItOnDemo';
import { useAuth } from '@/hooks/useAuth';
import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type DemoIdentity = 'giver' | 'applicant';

const labels: Record<DemoIdentity, string> = {
  giver: 'Item Giver',
  applicant: 'Item Requester',
};

const roleDescriptions: Record<DemoIdentity, string> = {
  giver: 'Publish free items and review requests.',
  applicant: 'Browse items, ask questions, and request items.',
};

export const DemoIdentitySwitcher = () => {
  const { user, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<DemoIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current: DemoIdentity | null =
    user?.username === 'pass-it-on-giver'
      ? 'giver'
      : user?.username === 'pass-it-on-applicant'
        ? 'applicant'
        : null;

  const switchTo = async (identity: DemoIdentity) => {
    setBusy(identity);
    setError(null);
    try {
      await authAPI.fetchCSRFToken();
      await passItOnDemoAPI.switchIdentity(identity);
      await refreshAuth();
      navigate('/demo/browse');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not switch identity.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Stack gap="xs" aria-label="Demo identity">
      <Text size="sm" fw={600}>
        {current ? `Signed in as ${labels[current]}` : 'Choose a demo identity'}
      </Text>
      {!user && (
        <Text size="xs" c="dimmed">
          Choose Item Giver to share an item, or Item Requester to browse and request one.
        </Text>
      )}
      {current && <Text size="xs" c="dimmed">{roleDescriptions[current]}</Text>}
      {user && !current && (
        <Alert color="yellow" title="A different account is signed in">
          Sign out of that account before switching to a demo identity.
        </Alert>
      )}
      {error && <Alert color="red">{error}</Alert>}
      <Group gap="xs" wrap="wrap">
        {(['giver', 'applicant'] as const).map(identity => (
          <Button
            key={identity}
            size="xs"
            variant={current === identity ? 'filled' : 'light'}
            disabled={Boolean(user && !current)}
            loading={busy === identity}
            onClick={() => switchTo(identity)}
          >
            {labels[identity]}
          </Button>
        ))}
      </Group>
    </Stack>
  );
};
