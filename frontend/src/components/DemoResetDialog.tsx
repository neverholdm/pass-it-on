import { Button, Group, Modal, Stack, Text } from '@mantine/core';

interface DemoResetDialogProps {
  opened: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export const DemoResetDialog = ({
  opened,
  loading = false,
  onCancel,
  onConfirm,
}: DemoResetDialogProps) => {
  return (
    <Modal opened={opened} onClose={onCancel} title="Reset the local demo?" centered>
      <Stack>
        <Text size="sm">
          This restores the two fictional demo accounts and their marked giveaway items,
          applications, and comments to the sample starting point. Other application data
          is outside the reset scope.
        </Text>
        <Text size="sm" fw={600}>
          Reset only the Pass It On demo data?
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button color="red" onClick={() => void onConfirm()} loading={loading}>
            Confirm reset
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
