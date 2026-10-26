from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase, override_settings
from rest_framework.test import APIClient


@override_settings(DEBUG=True, PASS_IT_ON_DEMO_MODE=True)
class DemoIdentitySwitchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.demo_group, _ = Group.objects.get_or_create(name="Pass It On Demo")
        user_model = get_user_model()
        self.giver = user_model.objects.create_user(
            username="pass-it-on-giver",
            email="giver@example.test",
            password="temporary-test-password",
            name="Demo Giver",
        )
        self.applicant = user_model.objects.create_user(
            username="pass-it-on-applicant",
            email="applicant@example.test",
            password="temporary-test-password",
            name="Demo Applicant",
        )
        self.giver.groups.add(self.demo_group)
        self.applicant.groups.add(self.demo_group)

    @staticmethod
    def response_details(response):
        return getattr(response, "data", response.content)

    def test_anonymous_local_switch_establishes_a_real_session(self):
        response = self.client.post(
            "/api/demo/identity/",
            {"identity": "giver"},
            format="json",
            HTTP_ORIGIN="http://127.0.0.1:18080",
        )

        self.assertEqual(response.status_code, 200, self.response_details(response))
        self.assertEqual(response.data["user"]["username"], self.giver.username)

        response = self.client.get("/api/profiles/me/")

        self.assertEqual(response.status_code, 200, self.response_details(response))
        self.assertEqual(response.data["username"], self.giver.username)

    def test_switch_changes_server_authenticated_identity(self):
        self.assertTrue(
            self.client.login(
                username=self.giver.username, password="temporary-test-password"
            )
        )
        previous_session_user = self.client.session.get("_auth_user_id")
        self.assertEqual(previous_session_user, str(self.giver.pk))

        response = self.client.post(
            "/api/demo/identity/",
            {"identity": "applicant"},
            format="json",
            HTTP_ORIGIN="http://localhost:18080",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["user"]["username"], self.applicant.username)

        response = self.client.get("/api/profiles/me/")

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["username"], self.applicant.username)

    def test_unknown_identity_does_not_change_session(self):
        self.assertTrue(
            self.client.login(
                username=self.giver.username, password="temporary-test-password"
            )
        )
        previous_session_user = self.client.session.get("_auth_user_id")

        response = self.client.post(
            "/api/demo/identity/",
            {"identity": "administrator"},
            format="json",
            HTTP_ORIGIN="http://127.0.0.1:18080",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            self.client.session.get("_auth_user_id"), previous_session_user
        )

    def test_switch_rejects_non_loopback_origin(self):
        response = self.client.post(
            "/api/demo/identity/",
            {"identity": "giver"},
            format="json",
            HTTP_ORIGIN="https://example.com",
        )

        self.assertEqual(response.status_code, 403)
        self.assertNotIn("_auth_user_id", self.client.session)

    @override_settings(PASS_IT_ON_DEMO_MODE=False)
    def test_switch_is_disabled_outside_demo_mode(self):
        response = self.client.post(
            "/api/demo/identity/",
            {"identity": "giver"},
            format="json",
            HTTP_ORIGIN="http://127.0.0.1:18080",
        )

        self.assertEqual(response.status_code, 404)
        self.assertNotIn("_auth_user_id", self.client.session)
