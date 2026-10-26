import { passItOnDemoAPI, DemoItem } from '@/services/custom/passItOnDemo';
import { useAuth } from '@/hooks/useAuth';
import { Alert, Badge, Button, Card, Group, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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

export const BrowsePage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<DemoItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const queryKey = JSON.stringify({ userId: user?.id, search: activeSearch, category });
  const loading = Boolean(user && loadedQuery !== queryKey);

  useEffect(() => {
    if (!user) return;
    let active = true;
    passItOnDemoAPI.listItems(activeSearch, category ?? '')
      .then(result => {
        if (active) {
          setItems(result);
          setError(null);
          setLoadedQuery(queryKey);
        }
      })
      .catch(cause => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Could not load items.');
          setLoadedQuery(queryKey);
        }
      });
    return () => { active = false; };
  }, [user, activeSearch, category, queryKey]);

  const clearFilters = () => { setSearch(''); setActiveSearch(''); setCategory(null); };

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Browse free items</Title>
        <Text c="dimmed" mt={4}>Find something useful and ask the giver about it.</Text>
      </div>
      {!user && <Alert color="blue">Choose Demo Giver or Demo Applicant above to browse the local sample items.</Alert>}
      {error && <Alert color="red" title="Could not load items">{error}</Alert>}
      <Card withBorder radius="lg" p="md">
        <form onSubmit={event => { event.preventDefault(); setActiveSearch(search.trim()); }}>
          <Group align="end" wrap="wrap">
            <TextInput
              label="Search items"
              placeholder="Try lamp or table"
              value={search}
              onChange={event => setSearch(event.currentTarget.value)}
              leftSection={<Search size={16} />}
              style={{ flex: '1 1 240px' }}
            />
            <Select
              label="Category"
              placeholder="All categories"
              clearable
              data={categories}
              value={category}
              onChange={setCategory}
              style={{ flex: '1 1 180px' }}
            />
            <Button type="submit" leftSection={<Search size={16} />}>Search</Button>
            <Button type="button" variant="default" leftSection={<X size={16} />} onClick={clearFilters}>Clear</Button>
          </Group>
        </form>
      </Card>
      {loading && <Text c="dimmed">Loading items…</Text>}
      {!loading && user && items.length === 0 && (
        <Card withBorder radius="lg" p="xl" ta="center">
          <Title order={3}>No items match those filters</Title>
          <Text c="dimmed" mt="xs">Try another word or category, or clear the filters.</Text>
          <Button mt="md" variant="light" onClick={clearFilters}>Clear filters</Button>
        </Card>
      )}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {items.map(item => <ItemCard key={item.id} item={item} />)}
      </SimpleGrid>
    </Stack>
  );
};

const ItemCard = ({ item }: { item: DemoItem }) => (
  <Card withBorder radius="lg" padding="lg" className="h-full" data-testid="demo-item-card">
    <Stack gap="sm" className="h-full">
      <Group justify="space-between" align="flex-start">
        <Title order={3} size="h4">{item.name}</Title>
        <Badge color={item.status === 'Available' ? 'green' : item.status === 'Reserved' ? 'yellow' : 'gray'}>{item.status}</Badge>
      </Group>
      <Text size="sm" c="dimmed" lineClamp={3}>{item.description}</Text>
      <Group justify="space-between" mt="auto">
        <Text size="sm">{item.category} · Free</Text>
        <Button component={Link} to={`/demo/item/${item.id}`} variant="light">View item</Button>
      </Group>
    </Stack>
  </Card>
);

export default BrowsePage;
