import { useAuth } from '@/hooks/useAuth';
import { DemoImpact, passItOnDemoAPI } from '@/services/custom/passItOnDemo';
import { Alert, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';

export const ImpactPage = () => {
  const { user } = useAuth();
  const [impact, setImpact] = useState<DemoImpact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    passItOnDemoAPI.impact()
      .then(result => { if (active) { setImpact(result); setError(null); } })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load impact data.'); });
    return () => { active = false; };
  }, [user]);

  return (
    <Stack gap="md">
      <div><Title order={2}>Small things add up</Title><Text c="dimmed" mt={4}>A view of the completed hand-offs in this demo.</Text></div>
      {!user && <Alert color="blue">Choose either demo identity above to view the local demo statistics.</Alert>}
      {error && <Alert color="red">{error}</Alert>}
      {impact && <>
        <Alert color="yellow" title="Simulated demo data">
          These numbers come only from completed fictional giveaway records on this local demo instance.
        </Alert>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Metric testId="completed-giveaways" label="Completed giveaways" value={impact.completed_giveaways} detail="Counted once per completed application." />
          <Metric testId="participants" label="People taking part" value={impact.participants} detail="Givers and recipients, counted once each." />
        </SimpleGrid>
      </>}
    </Stack>
  );
};

const Metric = ({ label, value, detail, testId }: { label: string; value: number; detail: string; testId: string }) => (
  <Card withBorder radius="lg" p="xl" data-testid={testId}>
    <Stack gap={4}><Text size="sm" c="dimmed">{label}</Text><Text fw={700} size="3rem" lh={1.1}>{value}</Text><Text size="sm" c="dimmed">{detail}</Text></Stack>
  </Card>
);

export default ImpactPage;
