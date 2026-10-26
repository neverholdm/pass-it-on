import { useAuth } from '@/hooks/useAuth';
import { DemoItemDetails, passItOnDemoAPI } from '@/services/custom/passItOnDemo';
import { Alert, Badge, Button, Card, Group, Stack, Text, Textarea, Title } from '@mantine/core';
import { ArrowLeft, Send } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

export const ItemDetailsPage = () => {
  const { itemUuid = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<DemoItemDetails | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user || !itemUuid) return;
    setLoading(true);
    try {
      setItem(await passItOnDemoAPI.getItem(itemUuid));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load this item.');
    } finally {
      setLoading(false);
    }
  }, [user, itemUuid]);

  useEffect(() => {
    if (!user || !itemUuid) return;
    let active = true;
    passItOnDemoAPI.getItem(itemUuid)
      .then(result => {
        if (active) {
          setItem(result);
          setLoadedFor(user.id);
          setError(null);
        }
      })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load this item.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, itemUuid]);

  const apply = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await passItOnDemoAPI.apply(itemUuid);
      navigate('/demo/activity');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not apply for this item.');
    } finally {
      setSubmitting(false);
    }
  };

  const postComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await passItOnDemoAPI.comment(itemUuid, message);
      setMessage('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not post that message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack gap="md" maw={800} mx="auto" w="100%">
      <Button component={Link} to="/demo/browse" variant="subtle" leftSection={<ArrowLeft size={16} />} w="fit-content">Back to browse</Button>
      {!user && <Alert color="blue">Choose a demo identity above to view item details and messages.</Alert>}
      {error && <Alert color="red">{error}</Alert>}
      {loading && <Text c="dimmed">Loading item…</Text>}
      {item && loadedFor === user?.id && <>
        <Card withBorder radius="lg" p="lg">
          <Stack>
            <Group justify="space-between" align="flex-start">
              <div>
                <Badge color={item.status === 'Available' ? 'green' : item.status === 'Reserved' ? 'yellow' : 'gray'}>{item.status}</Badge>
                <Title order={2} mt="sm">{item.name}</Title>
              </div>
              <Badge variant="light" color="teal">Free</Badge>
            </Group>
            <Text size="sm" c="dimmed">{item.category} · Offered by {item.owner}</Text>
            <Text>{item.description}</Text>
            {item.can_apply && user?.username !== 'pass-it-on-giver' && (
              <Button loading={submitting} onClick={apply}>Apply for this item</Button>
            )}
            {user?.username === 'pass-it-on-giver' && item.can_apply && (
              <Alert color="gray">You are the giver. Switch to Demo Applicant to request this item.</Alert>
            )}
            {!item.can_apply && <Alert color="gray">This item is not accepting new applications.</Alert>}
          </Stack>
        </Card>
        <Card withBorder radius="lg" p="lg">
          <Stack>
            <div>
              <Title order={3}>Public messages</Title>
              <Text size="sm" c="dimmed">Keep questions about the item here. Contact details are filtered out.</Text>
            </div>
            {item.comments.length === 0 ? <Text c="dimmed">No messages yet. Start the conversation.</Text> : item.comments.map(comment => (
              <div key={comment.id} className="border-b border-gray-200 pb-3 last:border-0">
                <Text size="sm" fw={600}>{comment.author}</Text>
                <Text mt={2}>{comment.body}</Text>
                <Text size="xs" c="dimmed" mt={2}>{new Date(comment.created_at).toLocaleString()}</Text>
              </div>
            ))}
            {user && (
              <form onSubmit={postComment}>
                <Stack>
                  <Textarea label="Add a public message" value={message} onChange={event => setMessage(event.currentTarget.value)} required minRows={2} />
                  <Button type="submit" variant="light" leftSection={<Send size={16} />} loading={submitting} disabled={!message.trim()}>Post message</Button>
                </Stack>
              </form>
            )}
          </Stack>
        </Card>
      </>}
    </Stack>
  );
};

export default ItemDetailsPage;
