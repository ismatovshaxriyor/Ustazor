import base64
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management import BaseCommand, call_command
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import USER_TYPE_CHOICES, WorkerProfile, WorkerSkill
from apps.chat.models import CHAT_MESSAGE_VISIBILITY_CHOICES, ChatMessage, ChatThread
from apps.jobs.models import JobOrder, ORDER_STATUS_CHOICES, PRICE_TYPE_CHOICES
from apps.proposals.models import PROPOSAL_STATUS_CHOICES, VacancyProposal
from apps.reviews.models import (
    WorkerPortfolio,
    WorkerPortfolioImage,
    WorkerReview,
    WorkerReviewImage,
)

User = get_user_model()

ONE_PIXEL_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2K7f8AAAAASUVORK5CYII="
)


class Command(BaseCommand):
    help = "Test uchun demo ma'lumotlarni yaratadi (mijozlar, ustalar, e'lonlar, murojaatlar, chat, baholar)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Avval bazani tozalaydi (flush).",
        )
        parser.add_argument(
            "--password",
            default="Test12345!",
            help="Yaratiladigan demo foydalanuvchilar uchun parol.",
        )
        parser.add_argument(
            "--no-superuser",
            action="store_true",
            help="Demo superuser yaratmaslik uchun.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            call_command("flush", interactive=False, verbosity=0)
            self.stdout.write(self.style.WARNING("Baza tozalandi (flush)."))

        password = options["password"]
        create_superuser = not options["no_superuser"]

        summary = {
            "users": 0,
            "worker_profiles": 0,
            "skills": 0,
            "orders": 0,
            "proposals": 0,
            "chat_threads": 0,
            "chat_messages": 0,
            "reviews": 0,
            "review_images": 0,
            "portfolios": 0,
            "portfolio_images": 0,
            "profile_photos": 0,
        }

        with transaction.atomic():
            self._seed_users_and_profiles(password, create_superuser, summary)
            self._seed_orders_proposals_chat(summary)
            self._seed_reviews(summary)

        self.stdout.write(self.style.SUCCESS("Demo ma'lumotlar muvaffaqiyatli yaratildi."))
        for key, value in summary.items():
            self.stdout.write(f" - {key}: {value}")

    def _image_file(self, name: str) -> ContentFile:
        return ContentFile(ONE_PIXEL_PNG_BYTES, name=f"{name}.png")

    def _create_user(
        self,
        *,
        email: str,
        phone_number: str,
        full_name: str,
        user_type: str,
        password: str,
        summary: dict,
    ):
        user = User.objects.create_user(
            email=email,
            phone_number=phone_number,
            full_name=full_name,
            user_type=user_type,
            password=password,
            is_active=True,
            is_verified=True,
        )
        summary["users"] += 1
        return user

    def _seed_users_and_profiles(self, password: str, create_superuser: bool, summary: dict):
        if create_superuser:
            User.objects.create_superuser(
                email="admin@ustazor.local",
                phone_number="+998900000001",
                full_name="Ustazor Admin",
                password=password,
                is_verified=True,
                is_active=True,
            )
            summary["users"] += 1

        client_specs = [
            ("aziza.client@ustazor.local", "+998901001001", "Aziza Karimova"),
            ("dilnoza.client@ustazor.local", "+998901001002", "Dilnoza Mamatova"),
            ("jamshid.client@ustazor.local", "+998901001003", "Jamshid Toirov"),
        ]
        worker_specs = [
            {
                "email": "bekzod.worker@ustazor.local",
                "phone": "+998902001001",
                "name": "Bekzod Usta",
                "specialization": "Elektrik",
                "city": "Toshkent",
                "experience": 8,
                "about": "Uy va ofis elektr tizimini to'liq montaj qilaman.",
                "is_available": True,
                "services": [
                    ("Elektr montaj", "Noldan elektr sim tortish va panel yig'ish.", 350000, 6500000, 8),
                    ("Nosozlik diagnostikasi", "Qisqa tutashuv va uzilishlarni topish.", 120000, 700000, 7),
                ],
            },
            {
                "email": "sardor.worker@ustazor.local",
                "phone": "+998902001002",
                "name": "Sardor Santexnik",
                "specialization": "Santexnik",
                "city": "Samarqand",
                "experience": 10,
                "about": "Issiq va sovuq suv tizimi, avariya ishlari bo'yicha tajribam katta.",
                "is_available": True,
                "services": [
                    ("Quvur montaj", "Polipropilen va metall quvurlar montaji.", 250000, 5200000, 10),
                    ("Avariya xizmati", "Tezkor chiqish va nosozlikni bartaraf etish.", 180000, 1200000, 9),
                ],
            },
            {
                "email": "shahzod.worker@ustazor.local",
                "phone": "+998902001003",
                "name": "Shahzod Malyar",
                "specialization": "Malyar",
                "city": "Buxoro",
                "experience": 6,
                "about": "Ichki va tashqi bo'yoq ishlari, dekor yechimlar.",
                "is_available": False,
                "services": [
                    ("Bo'yoq ishlari", "Devorga grunt, shpaklyovka va bo'yoq.", 300000, 4300000, 6),
                    ("Dekor bezak", "Dekorativ suvoq va tekstura ishlari.", 450000, 5800000, 5),
                ],
            },
            {
                "email": "nodira.worker@ustazor.local",
                "phone": "+998902001004",
                "name": "Nodira Mebelchi",
                "specialization": "Mebelchi",
                "city": "Farg'ona",
                "experience": 7,
                "about": "Buyurtma asosida mebel loyihalash va yig'ish.",
                "is_available": True,
                "services": [
                    ("Oshxona mebeli", "Oshxona garnituri ishlab chiqish va o'rnatish.", 2500000, 18000000, 7),
                    ("Shkaf yig'ish", "Kupe va klassik shkaf montaji.", 700000, 6400000, 6),
                ],
            },
            {
                "email": "javlon.worker@ustazor.local",
                "phone": "+998902001005",
                "name": "Javlon Quruvchi",
                "specialization": "Quruvchi",
                "city": "Andijon",
                "experience": 9,
                "about": "Qurilish va kapital ta'mir bo'yicha brigada bilan ishlayman.",
                "is_available": True,
                "services": [
                    ("Kapital ta'mir", "Kvartira va hovli uy kapital ta'miri.", 3000000, 45000000, 9),
                    ("G'isht terish", "Ichki va tashqi devor ishlari.", 900000, 18000000, 8),
                ],
            },
        ]

        self.clients = []
        self.workers = []

        for email, phone, name in client_specs:
            user = self._create_user(
                email=email,
                phone_number=phone,
                full_name=name,
                user_type=USER_TYPE_CHOICES.client,
                password=password,
                summary=summary,
            )
            user.profile_photo.save(f"client-{user.id}.png", self._image_file(f"client-{user.id}"), save=True)
            summary["profile_photos"] += 1
            self.clients.append(user)

        for idx, spec in enumerate(worker_specs):
            user = self._create_user(
                email=spec["email"],
                phone_number=spec["phone"],
                full_name=spec["name"],
                user_type=USER_TYPE_CHOICES.worker,
                password=password,
                summary=summary,
            )
            user.profile_photo.save(f"worker-{user.id}.png", self._image_file(f"worker-{user.id}"), save=True)
            summary["profile_photos"] += 1

            profile = WorkerProfile.objects.create(
                user=user,
                specialization=spec["specialization"],
                experience_years=spec["experience"],
                service_city=spec["city"],
                about=spec["about"],
                min_order_price=Decimal("200000.00") * Decimal(str(idx + 1)),
                is_available=spec["is_available"],
            )
            summary["worker_profiles"] += 1

            for service_title, description, min_price, max_price, exp in spec["services"]:
                WorkerSkill.objects.create(
                    profile=profile,
                    title=service_title,
                    description=description,
                    min_price=Decimal(str(min_price)),
                    max_price=Decimal(str(max_price)),
                    experience_years=exp,
                    extra_info="Material va muddat alohida kelishiladi.",
                    is_active=True,
                )
                summary["skills"] += 1

            for item_index in range(2):
                portfolio = WorkerPortfolio.objects.create(
                    worker=user,
                    title=f"{spec['specialization']} loyiha #{item_index + 1}",
                    description="Mijoz bilan kelishilgan ish to'liq yakunlangan.",
                    location=spec["city"],
                    completed_at=(timezone.now().date() - timedelta(days=(idx + 1) * (item_index + 7))),
                    is_featured=item_index == 0,
                )
                summary["portfolios"] += 1
                WorkerPortfolioImage.objects.create(
                    portfolio=portfolio,
                    image=self._image_file(f"portfolio-{portfolio.id}"),
                )
                summary["portfolio_images"] += 1

            self.workers.append(user)

    def _create_order(self, *, spec: dict):
        return JobOrder.objects.create(
            client=self.clients[spec["client_idx"]],
            assigned_worker=self.workers[spec["worker_idx"]] if spec.get("worker_idx") is not None else None,
            title=spec["title"],
            description=spec["description"],
            category=spec["category"],
            city=spec["city"],
            address=spec["address"],
            price_type=spec["price_type"],
            price_amount=Decimal(str(spec["price_amount"])) if spec.get("price_amount") else None,
            status=spec["status"],
            due_date=(timezone.now().date() + timedelta(days=spec["due_in_days"])) if spec.get("due_in_days") else None,
        )

    def _create_proposal_with_chat(
        self,
        *,
        order: JobOrder,
        worker,
        proposal_status: str,
        proposed_price: Decimal | None,
        cover_letter: str,
        summary: dict,
    ):
        proposal = VacancyProposal.objects.create(
            vacancy=order,
            worker=worker,
            cover_letter=cover_letter,
            proposed_price=proposed_price,
            status=proposal_status,
        )
        summary["proposals"] += 1

        thread, created = ChatThread.objects.get_or_create(
            client=order.client,
            worker=worker,
            defaults={'vacancy': order},
        )
        if created:
            summary["chat_threads"] += 1
        elif thread.vacancy_id != order.id:
            thread.vacancy = order
            thread.save(update_fields=["vacancy", "updated_at"])

        proposal.chat_thread = thread
        proposal.save(update_fields=["chat_thread"])

        now = timezone.now()
        ChatMessage.objects.create(
            thread=thread,
            sender=worker,
            body=cover_letter,
            delivered_to_client_at=now,
        )
        summary["chat_messages"] += 1

        if proposal_status == PROPOSAL_STATUS_CHOICES.pending:
            ChatMessage.objects.create(
                thread=thread,
                sender=order.client,
                body="Rahmat, taklifingizni ko'rib chiqyapman.",
                delivered_to_worker_at=now,
            )
            summary["chat_messages"] += 1
        elif proposal_status == PROPOSAL_STATUS_CHOICES.accepted:
            ChatMessage.objects.create(
                thread=thread,
                sender=order.client,
                body="Mijoz sizni ushbu e`lon uchun qabul qildi.",
                is_system=True,
                visibility=CHAT_MESSAGE_VISIBILITY_CHOICES.worker_only,
                delivered_to_worker_at=now,
            )
            summary["chat_messages"] += 1
        elif proposal_status == PROPOSAL_STATUS_CHOICES.rejected:
            ChatMessage.objects.create(
                thread=thread,
                sender=order.client,
                body="Mijoz ushbu e`lon bo`yicha murojaatni rad etdi.",
                is_system=True,
                visibility=CHAT_MESSAGE_VISIBILITY_CHOICES.all,
                delivered_to_worker_at=now,
            )
            summary["chat_messages"] += 1

        thread.save(update_fields=["updated_at"])
        return proposal

    def _seed_orders_proposals_chat(self, summary: dict):
        order_specs = [
            {
                "client_idx": 0,
                "title": "3 xonali kvartira elektr simlarini yangilash",
                "description": "Eski simlarni yangisiga almashtirish, rozetka nuqtalarini ko'paytirish kerak.",
                "category": "Elektrik",
                "city": "Toshkent",
                "address": "Yunusobod tumani",
                "price_type": PRICE_TYPE_CHOICES.fixed,
                "price_amount": 4200000,
                "status": ORDER_STATUS_CHOICES.open,
                "due_in_days": 7,
            },
            {
                "client_idx": 0,
                "title": "Hovli uyda suv quvuri avariya holati",
                "description": "Issiq suv quvuri sizib chiqqan, tezkor ta'mirlash kerak.",
                "category": "Santexnik",
                "city": "Toshkent",
                "address": "Olmazor tumani",
                "price_type": PRICE_TYPE_CHOICES.negotiable,
                "price_amount": None,
                "status": ORDER_STATUS_CHOICES.open,
                "due_in_days": 2,
            },
            {
                "client_idx": 0,
                "title": "Ofis devorlarini bo'yash",
                "description": "120 kv.m maydonda devorlarni tayyorlab bo'yash kerak.",
                "category": "Malyar",
                "city": "Toshkent",
                "address": "Mirzo Ulugbek tumani",
                "price_type": PRICE_TYPE_CHOICES.fixed,
                "price_amount": 3600000,
                "status": ORDER_STATUS_CHOICES.in_progress,
                "worker_idx": 2,
                "due_in_days": 5,
            },
            {
                "client_idx": 0,
                "title": "Shkaf va stol mebelini yig'ish",
                "description": "Yangi ofis uchun shkaf va stol setini yig'ish va o'rnatish kerak.",
                "category": "Mebelchi",
                "city": "Toshkent",
                "address": "Chilonzor tumani",
                "price_type": PRICE_TYPE_CHOICES.fixed,
                "price_amount": 2800000,
                "status": ORDER_STATUS_CHOICES.completed,
                "worker_idx": 3,
                "due_in_days": -6,
            },
            {
                "client_idx": 1,
                "title": "Yangi uyga santexnik montaj",
                "description": "Hammom va oshxona uchun to'liq santexnik ishlar kerak.",
                "category": "Santexnik",
                "city": "Samarqand",
                "address": "Registon yaqinida",
                "price_type": PRICE_TYPE_CHOICES.fixed,
                "price_amount": 6900000,
                "status": ORDER_STATUS_CHOICES.open,
                "due_in_days": 10,
            },
            {
                "client_idx": 1,
                "title": "Elektr panel va avtomatlarni yangilash",
                "description": "Eski panelni xavfsiz varianta almashtirish kerak.",
                "category": "Elektrik",
                "city": "Samarqand",
                "address": "Siyob tumani",
                "price_type": PRICE_TYPE_CHOICES.negotiable,
                "price_amount": None,
                "status": ORDER_STATUS_CHOICES.open,
                "due_in_days": 4,
            },
            {
                "client_idx": 1,
                "title": "Kvartira ichki ta'miri",
                "description": "Pol, ship va devorlar bo'yicha kompleks ta'mir kerak.",
                "category": "Quruvchi",
                "city": "Samarqand",
                "address": "Bog'ishamol",
                "price_type": PRICE_TYPE_CHOICES.fixed,
                "price_amount": 19500000,
                "status": ORDER_STATUS_CHOICES.in_progress,
                "worker_idx": 4,
                "due_in_days": 14,
            },
            {
                "client_idx": 1,
                "title": "Ofis uchun oshxona mebeli",
                "description": "3D loyiha bo'yicha mebel tayyorlash va o'rnatish.",
                "category": "Mebelchi",
                "city": "Samarqand",
                "address": "Markaziy ko'cha 22",
                "price_type": PRICE_TYPE_CHOICES.fixed,
                "price_amount": 12500000,
                "status": ORDER_STATUS_CHOICES.completed,
                "worker_idx": 3,
                "due_in_days": -11,
            },
            {
                "client_idx": 2,
                "title": "Kichik do'kon uchun bo'yoq va bezak",
                "description": "Ichki devorlar va vitrina qismini yangilash.",
                "category": "Malyar",
                "city": "Buxoro",
                "address": "Eski shahar",
                "price_type": PRICE_TYPE_CHOICES.fixed,
                "price_amount": 2900000,
                "status": ORDER_STATUS_CHOICES.open,
                "due_in_days": 6,
            },
            {
                "client_idx": 2,
                "title": "Quvurlarni almashtirish",
                "description": "Eski metall quvurlarni plastik quvurlarga almashtirish kerak.",
                "category": "Santexnik",
                "city": "Buxoro",
                "address": "Gijduvon yo'li",
                "price_type": PRICE_TYPE_CHOICES.negotiable,
                "price_amount": None,
                "status": ORDER_STATUS_CHOICES.open,
                "due_in_days": 8,
            },
            {
                "client_idx": 2,
                "title": "Yangi ofis elektr montaj",
                "description": "Noldan sim tortish, yoritish va avtomat o'rnatish.",
                "category": "Elektrik",
                "city": "Buxoro",
                "address": "Kogon tumani",
                "price_type": PRICE_TYPE_CHOICES.fixed,
                "price_amount": 7400000,
                "status": ORDER_STATUS_CHOICES.in_progress,
                "worker_idx": 0,
                "due_in_days": 9,
            },
            {
                "client_idx": 2,
                "title": "Hovli uy devori va tom qismini ta'mirlash",
                "description": "Yoriqlarni bartaraf etish va tom qismida ta'mir kerak.",
                "category": "Quruvchi",
                "city": "Buxoro",
                "address": "Romitan",
                "price_type": PRICE_TYPE_CHOICES.fixed,
                "price_amount": 14800000,
                "status": ORDER_STATUS_CHOICES.completed,
                "worker_idx": 4,
                "due_in_days": -15,
            },
            {
                "client_idx": 0,
                "title": "Kafe uchun stol-stullar yig'ish",
                "description": "Yangi kafe ichki qismi uchun mebel montaj ishlari.",
                "category": "Mebelchi",
                "city": "Toshkent",
                "address": "Sergeli tumani",
                "price_type": PRICE_TYPE_CHOICES.negotiable,
                "price_amount": None,
                "status": ORDER_STATUS_CHOICES.open,
                "due_in_days": 3,
            },
            {
                "client_idx": 1,
                "title": "Yotoqxona bo'yash va dekor",
                "description": "2 xonada bo'yoq va yengil dekor ishlari.",
                "category": "Malyar",
                "city": "Samarqand",
                "address": "Universitet ko'chasi",
                "price_type": PRICE_TYPE_CHOICES.fixed,
                "price_amount": 2100000,
                "status": ORDER_STATUS_CHOICES.open,
                "due_in_days": 5,
            },
            {
                "client_idx": 2,
                "title": "Eski e'lon (bekor qilingan)",
                "description": "Ish keyinroqqa qoldirilgani uchun e'lon bekor qilindi.",
                "category": "Elektrik",
                "city": "Buxoro",
                "address": "Markaz",
                "price_type": PRICE_TYPE_CHOICES.fixed,
                "price_amount": 1000000,
                "status": ORDER_STATUS_CHOICES.cancelled,
                "due_in_days": None,
            },
        ]

        self.orders = []
        for spec in order_specs:
            order = self._create_order(spec=spec)
            self.orders.append(order)
            summary["orders"] += 1

        for idx, order in enumerate(self.orders):
            workers_pool = [worker for worker in self.workers if worker.id != order.client_id]
            primary_worker = workers_pool[idx % len(workers_pool)]
            secondary_worker = workers_pool[(idx + 2) % len(workers_pool)]

            if order.status == ORDER_STATUS_CHOICES.open:
                self._create_proposal_with_chat(
                    order=order,
                    worker=primary_worker,
                    proposal_status=PROPOSAL_STATUS_CHOICES.pending,
                    proposed_price=Decimal("1500000.00") + Decimal(str(idx * 110000)),
                    cover_letter="Assalomu alaykum, bu ishni sifatli va tez bajarib beraman.",
                    summary=summary,
                )
                self._create_proposal_with_chat(
                    order=order,
                    worker=secondary_worker,
                    proposal_status=PROPOSAL_STATUS_CHOICES.rejected,
                    proposed_price=Decimal("1800000.00") + Decimal(str(idx * 90000)),
                    cover_letter="Narx va muddat bo'yicha mos variant taklif qilaman.",
                    summary=summary,
                )
                continue

            if order.status in {ORDER_STATUS_CHOICES.in_progress, ORDER_STATUS_CHOICES.completed}:
                accepted_worker = order.assigned_worker
                self._create_proposal_with_chat(
                    order=order,
                    worker=accepted_worker,
                    proposal_status=PROPOSAL_STATUS_CHOICES.accepted,
                    proposed_price=order.price_amount or Decimal("0.00"),
                    cover_letter="Loyihani brigada bilan kelishilgan tartibda boshlayman.",
                    summary=summary,
                )

                if secondary_worker.id != accepted_worker.id:
                    self._create_proposal_with_chat(
                        order=order,
                        worker=secondary_worker,
                        proposal_status=PROPOSAL_STATUS_CHOICES.rejected,
                        proposed_price=Decimal("2000000.00") + Decimal(str(idx * 75000)),
                        cover_letter="Agar kerak bo'lsa, qo'shimcha yordam bera olaman.",
                        summary=summary,
                    )

    def _seed_reviews(self, summary: dict):
        completed_orders = [
            order for order in self.orders
            if order.status == ORDER_STATUS_CHOICES.completed and order.assigned_worker_id
        ]
        comments = [
            "Ish sifati juda yaxshi, muddatida tugatildi.",
            "Usta mas'uliyatli, toza va tartibli ishladi.",
            "Narx va sifat mutanosib, tavsiya qilaman.",
            "Kelishilgan ishlar to'liq bajarildi, rahmat.",
            "Muloqot ham yaxshi, ish ham puxta chiqdi.",
        ]
        ratings = [5, 4, 5, 4, 5]

        for index, order in enumerate(completed_orders):
            review = WorkerReview.objects.create(
                order=order,
                client=order.client,
                worker=order.assigned_worker,
                rating=ratings[index % len(ratings)],
                comment=comments[index % len(comments)],
            )
            summary["reviews"] += 1
            WorkerReviewImage.objects.create(
                review=review,
                image=self._image_file(f"review-{review.id}"),
            )
            summary["review_images"] += 1
