import { useAuth } from '@/hooks/useAuth';
import { passItOnDemoAPI } from '@/services/custom/passItOnDemo';
import { Alert, Button, Card, Select, Stack, Text, TextInput, Textarea, Title } from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const categories = [
  { value: 'books', label: 'Books' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'garden', label: 'Garden' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'other', label: 'Other' },
  { value: 'sports', label: 'Sports' },
  { value: 'tools', label: 'Tools' },
  { value: 'toys', label: 'Toys' },
];

export const GiveItemPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const item = await passItOnDemoAPI.createItem({ name, category: category ?? '', description });
      navigate(`/demo/item/${item.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="md" maw={720} mx="auto" w="100%">
      <div>
        <Title order={2}>Give something a new home</Title>
        <Text c="dimmed" mt={4}>Add a free item for the other demo identity to request.</Text>
      </div>
      {!user && <Alert color="blue">Choose a demo identity above before adding an item.</Alert>}
      {error && <Alert color="red" title="The item was not saved">{error}</Alert>}
      <Card withBorder radius="lg" p="lg">
        <form onSubmit={submit}>
          <Stack>
            <TextInput label="Item name" value={name} onChange={event => setName(event.currentTarget.value)} required maxLength={200} />
            <Select label="Category" placeholder="Choose a category" data={categories} value={category} onChange={setCategory} required />
            <Textarea label="Description" description="Do not include contact details in public information." value={description} onChange={event => setDescription(event.currentTarget.value)} minRows={4} required />
            <Text size="sm" c="dimmed">This demo listing is always free. It will not ask for payment or show your contact details.</Text>
            <Button type="submit" loading={saving} disabled={!user || !category || !name.trim() || !description.trim()}>
              Publish free item
            </Button>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
};

export default GiveItemPage;
