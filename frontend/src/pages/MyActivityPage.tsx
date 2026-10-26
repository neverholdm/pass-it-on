import { DemoResetDialog } from '@/components/DemoResetDialog';
import { useAuth } from '@/hooks/useAuth';
import { DemoActivity, DemoBooking, passItOnDemoAPI } from '@/services/custom/passItOnDemo';
import { Alert, Badge, Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export const MyActivityPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DemoActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const isGiver = user?.username === 'pass-it-on-giver';

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try { setData(await passItOnDemoAPI.activity()); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load activity.'); }
    finally { setBusy(false); }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    passItOnDemoAPI.activity()
      .then(result => {
        if (active) {
          setData(result);
          setError(null);
        }
      })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load activity.');
      })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [user]);

  const act = async (booking: DemoBooking, action: string) => {
    setBusy(true);
    setError(null);
    try { await passItOnDemoAPI.action(booking.id, action); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'That action could not be completed.'); setBusy(false); }
  };

  const confirmReset = async () => {
    setResetting(true);
    try {
      await passItOnDemoAPI.reset();
      setResetOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reset demo data.');
    } finally { setResetting(false); }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div><Title order={2}>My activity</Title><Text c="dimmed" mt={4}>Your items, applications, and requests from the other demo identity.</Text></div>
        {isGiver && <Button variant="light" color="red" onClick={() => setResetOpen(true)}>Reset demo</Button>}
      </Group>
      {!user && <Alert color="blue">Choose a demo identity above to see its activity.</Alert>}
      {error && <Alert color="red">{error}</Alert>}
      {busy && <Text size="sm" c="dimmed">Updating activity…</Text>}
      {data && data.identity === user?.username && <>
        <section>
          <Title order={3} mb="sm">Items I gave</Title>
          {data.items.length === 0 ? <Empty text="You have not posted a demo item yet." /> : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              {data.items.map(item => <Card withBorder radius="lg" key={item.id} data-testid="giver-item-card">
                <Group justify="space-between" align="flex-start"><Text fw={600}>{item.name}</Text><Badge>{item.status}</Badge></Group>
                <Button component={Link} to={`/demo/item/${item.id}`} variant="subtle" size="xs" mt="sm">View item</Button>
              </Card>)}
            </SimpleGrid>
          )}
        </section>
        <section>
          <Title order={3} mb="sm">Applications I sent</Title>
          {data.applications.length === 0 ? <Empty text="You have not applied for a demo item yet." /> : <Stack>
            {data.applications.map(booking => <Card withBorder radius="lg" key={booking.id} data-testid="application-card">
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <div><Text fw={600}>{booking.item.name}</Text><Text size="sm" c="dimmed">Application status</Text></div>
                <Badge color={booking.status === 'Completed' ? 'green' : booking.status === 'Pending' ? 'yellow' : 'gray'}>{statusLabel(booking.status)}</Badge>
              </Group>
              <Group mt="sm">
                {booking.status === 'Confirmed' && <Button size="xs" onClick={() => void act(booking, 'confirm-received')}>Confirm received</Button>}
                {['Pending', 'Confirmed'].includes(booking.status) && <Button size="xs" variant="default" onClick={() => void act(booking, 'cancel')}>Cancel application</Button>}
              </Group>
            </Card>)}
          </Stack>}
        </section>
        <section>
          <Title order={3} mb="sm">Applications I received</Title>
          {data.received.length === 0 ? <Empty text="No one has applied for your items yet." /> : <Stack>
            {data.received.map(booking => <Card withBorder radius="lg" key={booking.id} data-testid="received-card">
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <div><Text fw={600}>{booking.item.name}</Text><Text size="sm" c="dimmed">From {booking.applicant}</Text></div>
                <Badge color={booking.status === 'Pending' ? 'yellow' : booking.status === 'Completed' ? 'green' : 'gray'}>{statusLabel(booking.status)}</Badge>
              </Group>
              <Group mt="sm">
                {isGiver && booking.status === 'Pending' && <>
                  <Button size="xs" onClick={() => void act(booking, 'approve')}>Approve</Button>
                  <Button size="xs" variant="default" onClick={() => void act(booking, 'reject')}>Decline</Button>
                </>}
                {isGiver && ['Pending', 'Confirmed'].includes(booking.status) && <Button size="xs" variant="default" onClick={() => void act(booking, 'cancel')}>Cancel application</Button>}
              </Group>
            </Card>)}
          </Stack>}
        </section>
      </>}
      <DemoResetDialog opened={resetOpen} loading={resetting} onCancel={() => setResetOpen(false)} onConfirm={confirmReset} />
    </Stack>
  );
};

const Empty = ({ text }: { text: string }) => <Card withBorder radius="lg"><Text size="sm" c="dimmed">{text}</Text></Card>;
const statusLabel = (status: string) => status === 'Rejected' ? 'Not selected' : status === 'Cancelled' ? 'Cancelled' : status;

export default MyActivityPage;
