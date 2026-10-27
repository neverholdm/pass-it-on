# Pass It On Demo Guide

## About this demo

Pass It On is a local adaptation of Sharebubble for demonstrating free item hand-offs. It uses two fictional identities and fictional sample records. Impact figures are simulated and are derived from completed demo bookings.

The adaptation is based on [Sharebubble `bubble`](https://github.com/sharebubble/bubble/tree/362a83fc9edb25fccdeddd5716629a3e6f2e1d05), commit `362a83fc9edb25fccdeddd5716629a3e6f2e1d05`. The upstream GNU AGPL v3 `LICENSE` is retained. Pass It On changes are in the demo API, demo pages, local seed/reset flow, and browser checks.

## Start the local demo

Run these commands from the Sharebubble checkout root. Docker Desktop with Docker Compose is required.

```sh
docker compose up -d --build
docker compose exec backend uv run python manage.py reset_demo
```

Open <http://127.0.0.1:18080/demo/browse>. The sample identities are selected on the page; no real account or password is needed. The frontend is published on the local computer's loopback address. The backend API has no host port mapping.

To stop the stack while preserving its database volume:

```sh
docker compose down
```

Do not use `docker compose down -v` if you want to keep the local database.

## Walk through a hand-off

1. Select **Item Giver**, open **Give an item**, and publish a fictional free item.
2. Select **Item Requester**, search for the item, open its details, leave a public message, and apply.
3. Select **Item Giver**, open **My activity**, and approve the application.
4. Select **Item Requester**, open **My activity**, and confirm receipt.
5. Open **Impact** to see the completed hand-off count. The page labels these as simulated demo data.

The browser session and saved records survive page navigation and refresh. The sample includes an available vase, an available lamp with a pending request, and a completed side-table hand-off.

## Restore the sample

On **My activity**, select **Reset demo** and confirm. The reset deletes and recreates only the two named demo identities and records carrying the Pass It On demo marker. It does not clear the database or change unmarked records. The same reset can also be run from the checkout root:

```sh
docker compose exec backend uv run python manage.py reset_demo
```

## Verification record

The local implementation was checked with the backend demo suite, frontend typecheck/build and scoped lint, and Playwright in the installed Microsoft Edge browser against `http://127.0.0.1:18080`. The six local browser scenarios include browsing and filters, reset, three repeated hand-off rounds, impact, activity cancellation, and 320/768/1280 pixel layouts. See the workspace [quickstart and verification limits](../../../specs/001-free-giveaway-demo/quickstart.md) for exact commands.
