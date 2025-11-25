fsrs
py-fsrs
Py-FSRS is the official Python implementation of the FSRS scheduler algorithm, which can be used to develop spaced repetition systems.

"""
py-fsrs
-------

Py-FSRS is the official Python implementation of the FSRS scheduler algorithm, which can be used to develop spaced repetition systems.
"""

from fsrs.scheduler import Scheduler
from fsrs.state import State
from fsrs.card import Card
from fsrs.rating import Rating
from fsrs.review_log import ReviewLog
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fsrs.optimizer import Optimizer


# lazy load the Optimizer module due to heavy dependencies
def __getattr__(name: str) -> type:
    if name == "Optimizer":
        global Optimizer
        from fsrs.optimizer import Optimizer

        return Optimizer
    raise AttributeError


__all__ = ["Scheduler", "Card", "Rating", "ReviewLog", "State", "Optimizer"]
@dataclass(init=False)
class Scheduler:
@dataclass(init=False)
class Scheduler:
    """
    The FSRS scheduler.

    Enables the reviewing and future scheduling of cards according to the FSRS algorithm.

    Attributes:
        parameters: The model weights of the FSRS scheduler.
        desired_retention: The desired retention rate of cards scheduled with the scheduler.
        learning_steps: Small time intervals that schedule cards in the Learning state.
        relearning_steps: Small time intervals that schedule cards in the Relearning state.
        maximum_interval: The maximum number of days a Review-state card can be scheduled into the future.
        enable_fuzzing: Whether to apply a small amount of random 'fuzz' to calculated intervals.
    """

    parameters: tuple[float, ...]
    desired_retention: float
    learning_steps: tuple[timedelta, ...]
    relearning_steps: tuple[timedelta, ...]
    maximum_interval: int
    enable_fuzzing: bool

    def __init__(
        self,
        parameters: Sequence[float] = DEFAULT_PARAMETERS,
        desired_retention: float = 0.9,
        learning_steps: tuple[timedelta, ...] | list[timedelta] = (
            timedelta(minutes=1),
            timedelta(minutes=10),
        ),
        relearning_steps: tuple[timedelta, ...] | list[timedelta] = (
            timedelta(minutes=10),
        ),
        maximum_interval: int = 36500,
        enable_fuzzing: bool = True,
    ) -> None:
        self._validate_parameters(parameters=parameters)

        self.parameters = tuple(parameters)
        self.desired_retention = desired_retention
        self.learning_steps = tuple(learning_steps)
        self.relearning_steps = tuple(relearning_steps)
        self.maximum_interval = maximum_interval
        self.enable_fuzzing = enable_fuzzing

        self._DECAY = -self.parameters[20]
        self._FACTOR = 0.9 ** (1 / self._DECAY) - 1

    def _validate_parameters(self, *, parameters: Sequence[float]) -> None:
        if len(parameters) != len(LOWER_BOUNDS_PARAMETERS):
            raise ValueError(
                f"Expected {len(LOWER_BOUNDS_PARAMETERS)} parameters, got {len(parameters)}."
            )

        error_messages = []
        for index, (parameter, lower_bound, upper_bound) in enumerate(
            zip(parameters, LOWER_BOUNDS_PARAMETERS, UPPER_BOUNDS_PARAMETERS)
        ):
            if not lower_bound <= parameter <= upper_bound:
                error_message = f"parameters[{index}] = {parameter} is out of bounds: ({lower_bound}, {upper_bound})"
                error_messages.append(error_message)

        if len(error_messages) > 0:
            raise ValueError(
                "One or more parameters are out of bounds:\n"
                + "\n".join(error_messages)
            )

    def get_card_retrievability(
        self, card: Card, current_datetime: datetime | None = None
    ) -> float:
        """
        Calculates a Card object's current retrievability for a given date and time.

        The retrievability of a card is the predicted probability that the card is correctly recalled at the provided datetime.

        Args:
            card: The card whose retrievability is to be calculated
            current_datetime: The current date and time

        Returns:
            float: The retrievability of the Card object.
        """

        if card.last_review is None:
            return 0

        if current_datetime is None:
            current_datetime = datetime.now(timezone.utc)

        elapsed_days = max(0, (current_datetime - card.last_review).days)

        return (1 + self._FACTOR * elapsed_days / card.stability) ** self._DECAY

    def review_card(
        self,
        card: Card,
        rating: Rating,
        review_datetime: datetime | None = None,
        review_duration: int | None = None,
    ) -> tuple[Card, ReviewLog]:
        """
        Reviews a card with a given rating at a given time for a specified duration.

        Args:
            card: The card being reviewed.
            rating: The chosen rating for the card being reviewed.
            review_datetime: The date and time of the review.
            review_duration: The number of miliseconds it took to review the card or None if unspecified.

        Returns:
            tuple[Card,ReviewLog]: A tuple containing the updated, reviewed card and its corresponding review log.

        Raises:
            ValueError: If the `review_datetime` argument is not timezone-aware and set to UTC.
        """

        if review_datetime is not None and (
            (review_datetime.tzinfo is None) or (review_datetime.tzinfo != timezone.utc)
        ):
            raise ValueError("datetime must be timezone-aware and set to UTC")

        card = copy(card)

        if review_datetime is None:
            review_datetime = datetime.now(timezone.utc)

        days_since_last_review = (
            (review_datetime - card.last_review).days if card.last_review else None
        )

        match card.state:
            case State.Learning:
                assert card.step is not None

                # update the card's stability and difficulty
                if card.stability is None or card.difficulty is None:
                    card.stability = self._initial_stability(rating=rating)
                    card.difficulty = self._initial_difficulty(
                        rating=rating, clamp=True
                    )

                elif days_since_last_review is not None and days_since_last_review < 1:
                    card.stability = self._short_term_stability(
                        stability=card.stability, rating=rating
                    )
                    card.difficulty = self._next_difficulty(
                        difficulty=card.difficulty, rating=rating
                    )

                else:
                    card.stability = self._next_stability(
                        difficulty=card.difficulty,
                        stability=card.stability,
                        retrievability=self.get_card_retrievability(
                            card,
                            current_datetime=review_datetime,
                        ),
                        rating=rating,
                    )
                    card.difficulty = self._next_difficulty(
                        difficulty=card.difficulty, rating=rating
                    )

                # calculate the card's next interval
                ## first if-clause handles edge case where the Card in the Learning state was previously
                ## scheduled with a Scheduler with more learning_steps than the current Scheduler
                if len(self.learning_steps) == 0 or (
                    card.step >= len(self.learning_steps)
                    and rating in (Rating.Hard, Rating.Good, Rating.Easy)
                ):
                    card.state = State.Review
                    card.step = None

                    next_interval_days = self._next_interval(stability=card.stability)
                    next_interval = timedelta(days=next_interval_days)

                else:
                    match rating:
                        case Rating.Again:
                            card.step = 0
                            next_interval = self.learning_steps[card.step]

                        case Rating.Hard:
                            # card step stays the same

                            if card.step == 0 and len(self.learning_steps) == 1:
                                next_interval = self.learning_steps[0] * 1.5
                            elif card.step == 0 and len(self.learning_steps) >= 2:
                                next_interval = (
                                    self.learning_steps[0] + self.learning_steps[1]
                                ) / 2.0
                            else:
                                next_interval = self.learning_steps[card.step]

                        case Rating.Good:
                            if card.step + 1 == len(
                                self.learning_steps
                            ):  # the last step
                                card.state = State.Review
                                card.step = None

                                next_interval_days = self._next_interval(
                                    stability=card.stability
                                )
                                next_interval = timedelta(days=next_interval_days)

                            else:
                                card.step += 1
                                next_interval = self.learning_steps[card.step]

                        case Rating.Easy:
                            card.state = State.Review
                            card.step = None

                            next_interval_days = self._next_interval(
                                stability=card.stability
                            )
                            next_interval = timedelta(days=next_interval_days)

            case State.Review:
                assert card.stability is not None
                assert card.difficulty is not None

                # update the card's stability and difficulty
                if days_since_last_review is not None and days_since_last_review < 1:
                    card.stability = self._short_term_stability(
                        stability=card.stability, rating=rating
                    )
                else:
                    card.stability = self._next_stability(
                        difficulty=card.difficulty,
                        stability=card.stability,
                        retrievability=self.get_card_retrievability(
                            card,
                            current_datetime=review_datetime,
                        ),
                        rating=rating,
                    )

                card.difficulty = self._next_difficulty(
                    difficulty=card.difficulty, rating=rating
                )

                # calculate the card's next interval
                match rating:
                    case Rating.Again:
                        # if there are no relearning steps (they were left blank)
                        if len(self.relearning_steps) == 0:
                            next_interval_days = self._next_interval(
                                stability=card.stability
                            )
                            next_interval = timedelta(days=next_interval_days)

                        else:
                            card.state = State.Relearning
                            card.step = 0

                            next_interval = self.relearning_steps[card.step]

                    case Rating.Hard | Rating.Good | Rating.Easy:
                        next_interval_days = self._next_interval(
                            stability=card.stability
                        )
                        next_interval = timedelta(days=next_interval_days)

            case State.Relearning:
                assert card.stability is not None
                assert card.difficulty is not None
                assert card.step is not None

                # update the card's stability and difficulty
                if days_since_last_review is not None and days_since_last_review < 1:
                    card.stability = self._short_term_stability(
                        stability=card.stability, rating=rating
                    )
                    card.difficulty = self._next_difficulty(
                        difficulty=card.difficulty, rating=rating
                    )

                else:
                    card.stability = self._next_stability(
                        difficulty=card.difficulty,
                        stability=card.stability,
                        retrievability=self.get_card_retrievability(
                            card,
                            current_datetime=review_datetime,
                        ),
                        rating=rating,
                    )
                    card.difficulty = self._next_difficulty(
                        difficulty=card.difficulty, rating=rating
                    )

                # calculate the card's next interval
                ## first if-clause handles edge case where the Card in the Relearning state was previously
                ## scheduled with a Scheduler with more relearning_steps than the current Scheduler
                if len(self.relearning_steps) == 0 or (
                    card.step >= len(self.relearning_steps)
                    and rating in (Rating.Hard, Rating.Good, Rating.Easy)
                ):
                    card.state = State.Review
                    card.step = None

                    next_interval_days = self._next_interval(stability=card.stability)
                    next_interval = timedelta(days=next_interval_days)

                else:
                    match rating:
                        case Rating.Again:
                            card.step = 0
                            next_interval = self.relearning_steps[card.step]

                        case Rating.Hard:
                            # card step stays the same

                            if card.step == 0 and len(self.relearning_steps) == 1:
                                next_interval = self.relearning_steps[0] * 1.5
                            elif card.step == 0 and len(self.relearning_steps) >= 2:
                                next_interval = (
                                    self.relearning_steps[0] + self.relearning_steps[1]
                                ) / 2.0
                            else:
                                next_interval = self.relearning_steps[card.step]

                        case Rating.Good:
                            if card.step + 1 == len(
                                self.relearning_steps
                            ):  # the last step
                                card.state = State.Review
                                card.step = None

                                next_interval_days = self._next_interval(
                                    stability=card.stability
                                )
                                next_interval = timedelta(days=next_interval_days)

                            else:
                                card.step += 1
                                next_interval = self.relearning_steps[card.step]

                        case Rating.Easy:
                            card.state = State.Review
                            card.step = None

                            next_interval_days = self._next_interval(
                                stability=card.stability
                            )
                            next_interval = timedelta(days=next_interval_days)

        if self.enable_fuzzing and card.state == State.Review:
            next_interval = self._get_fuzzed_interval(interval=next_interval)

        card.due = review_datetime + next_interval
        card.last_review = review_datetime

        review_log = ReviewLog(
            card_id=card.card_id,
            rating=rating,
            review_datetime=review_datetime,
            review_duration=review_duration,
        )

        return card, review_log

    def reschedule_card(self, card: Card, review_logs: list[ReviewLog]) -> Card:
        """
        Reschedules/updates the given card with the current scheduler provided that card's review logs.

        If the current card was previously scheduled with a different scheduler, you may want to reschedule/update
        it as if it had always been scheduled with this current scheduler. For example, you may want to reschedule
        each of your cards with a new scheduler after computing the optimal parameters with the Optimizer.

        Args:
            card: The card to be rescheduled/updated.
            review_logs: A list of that card's review logs (order doesn't matter).

        Returns:
            Card: A new card that has been rescheduled/updated with this current scheduler.

        Raises:
            ValueError: If any of the review logs are for a card other than the one specified, this will raise an error.

        """

        for review_log in review_logs:
            if review_log.card_id != card.card_id:
                raise ValueError(
                    f"ReviewLog card_id {review_log.card_id} does not match Card card_id {card.card_id}"
                )

        review_logs = sorted(review_logs, key=lambda log: log.review_datetime)

        rescheduled_card = Card(card_id=card.card_id, due=card.due)

        for review_log in review_logs:
            rescheduled_card, _ = self.review_card(
                card=rescheduled_card,
                rating=review_log.rating,
                review_datetime=review_log.review_datetime,
            )

        return rescheduled_card

    def to_dict(
        self,
    ) -> SchedulerDict:
        """
        Returns a dictionary representation of the Scheduler object.

        Returns:
            SchedulerDict: A dictionary representation of the Scheduler object.
        """

        return {
            "parameters": list(self.parameters),
            "desired_retention": self.desired_retention,
            "learning_steps": [
                int(learning_step.total_seconds())
                for learning_step in self.learning_steps
            ],
            "relearning_steps": [
                int(relearning_step.total_seconds())
                for relearning_step in self.relearning_steps
            ],
            "maximum_interval": self.maximum_interval,
            "enable_fuzzing": self.enable_fuzzing,
        }

    @classmethod
    def from_dict(cls, source_dict: SchedulerDict) -> Self:
        """
        Creates a Scheduler object from an existing dictionary.

        Args:
            source_dict: A dictionary representing an existing Scheduler object.

        Returns:
            Self: A Scheduler object created from the provided dictionary.
        """

        return cls(
            parameters=source_dict["parameters"],
            desired_retention=source_dict["desired_retention"],
            learning_steps=[
                timedelta(seconds=learning_step)
                for learning_step in source_dict["learning_steps"]
            ],
            relearning_steps=[
                timedelta(seconds=relearning_step)
                for relearning_step in source_dict["relearning_steps"]
            ],
            maximum_interval=source_dict["maximum_interval"],
            enable_fuzzing=source_dict["enable_fuzzing"],
        )

    def to_json(self, indent: int | str | None = None) -> str:
        """
        Returns a JSON-serialized string of the Scheduler object.

        Args:
            indent: Equivalent argument to the indent in json.dumps()

        Returns:
            str: A JSON-serialized string of the Scheduler object.
        """

        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_json(cls, source_json: str) -> Self:
        """
        Creates a Scheduler object from a JSON-serialized string.

        Args:
            source_json: A JSON-serialized string of an existing Scheduler object.

        Returns:
            Self: A Scheduler object created from the JSON string.
        """

        source_dict: SchedulerDict = json.loads(source_json)
        return cls.from_dict(source_dict=source_dict)

    def _clamp_difficulty(self, *, difficulty: float) -> float:
        if isinstance(difficulty, Real):
            difficulty = min(max(difficulty, MIN_DIFFICULTY), MAX_DIFFICULTY)
        else:  # type(difficulty) is torch.Tensor
            difficulty = difficulty.clamp(min=MIN_DIFFICULTY, max=MAX_DIFFICULTY)  # type: ignore[attr-defined]

        return difficulty

    def _clamp_stability(self, *, stability: float) -> float:
        if isinstance(stability, Real):
            stability = max(stability, STABILITY_MIN)
        else:  # type(stability) is torch.Tensor
            stability = stability.clamp(min=STABILITY_MIN)  # type: ignore[attr-defined]

        return stability

    def _initial_stability(self, *, rating: Rating) -> float:
        initial_stability = self.parameters[rating - 1]

        initial_stability = self._clamp_stability(stability=initial_stability)

        return initial_stability

    def _initial_difficulty(self, *, rating: Rating, clamp: bool) -> float:
        initial_difficulty = (
            self.parameters[4] - (math.e ** (self.parameters[5] * (rating - 1))) + 1
        )

        if clamp:
            initial_difficulty = self._clamp_difficulty(difficulty=initial_difficulty)

        return initial_difficulty

    def _next_interval(self, *, stability: float) -> int:
        next_interval = (stability / self._FACTOR) * (
            (self.desired_retention ** (1 / self._DECAY)) - 1
        )

        if not isinstance(next_interval, Real):  # type(next_interval) is torch.Tensor
            next_interval = next_interval.detach().item()

        next_interval = round(next_interval)  # intervals are full days

        # must be at least 1 day long
        next_interval = max(next_interval, 1)

        # can not be longer than the maximum interval
        next_interval = min(next_interval, self.maximum_interval)

        return next_interval

    def _short_term_stability(self, *, stability: float, rating: Rating) -> float:
        short_term_stability_increase = (
            math.e ** (self.parameters[17] * (rating - 3 + self.parameters[18]))
        ) * (stability ** -self.parameters[19])

        if rating in (Rating.Good, Rating.Easy):
            if isinstance(short_term_stability_increase, Real):
                short_term_stability_increase = max(short_term_stability_increase, 1.0)
            else:  # type(short_term_stability_increase) is torch.Tensor
                short_term_stability_increase = short_term_stability_increase.clamp(
                    min=1.0
                )

        short_term_stability = stability * short_term_stability_increase

        short_term_stability = self._clamp_stability(stability=short_term_stability)

        return short_term_stability

    def _next_difficulty(self, *, difficulty: float, rating: Rating) -> float:
        def _linear_damping(*, delta_difficulty: float, difficulty: float) -> float:
            return (10.0 - difficulty) * delta_difficulty / 9.0

        def _mean_reversion(*, arg_1: float, arg_2: float) -> float:
            return self.parameters[7] * arg_1 + (1 - self.parameters[7]) * arg_2

        arg_1 = self._initial_difficulty(rating=Rating.Easy, clamp=False)

        delta_difficulty = -(self.parameters[6] * (rating - 3))
        arg_2 = difficulty + _linear_damping(
            delta_difficulty=delta_difficulty, difficulty=difficulty
        )

        next_difficulty = _mean_reversion(arg_1=arg_1, arg_2=arg_2)

        next_difficulty = self._clamp_difficulty(difficulty=next_difficulty)

        return next_difficulty

    def _next_stability(
        self,
        *,
        difficulty: float,
        stability: float,
        retrievability: float,
        rating: Rating,
    ) -> float:
        if rating == Rating.Again:
            next_stability = self._next_forget_stability(
                difficulty=difficulty,
                stability=stability,
                retrievability=retrievability,
            )

        elif rating in (Rating.Hard, Rating.Good, Rating.Easy):
            next_stability = self._next_recall_stability(
                difficulty=difficulty,
                stability=stability,
                retrievability=retrievability,
                rating=rating,
            )

        next_stability = self._clamp_stability(stability=next_stability)

        return next_stability

    def _next_forget_stability(
        self, *, difficulty: float, stability: float, retrievability: float
    ) -> float:
        next_forget_stability_long_term_params = (
            self.parameters[11]
            * (difficulty ** -self.parameters[12])
            * (((stability + 1) ** (self.parameters[13])) - 1)
            * (math.e ** ((1 - retrievability) * self.parameters[14]))
        )

        next_forget_stability_short_term_params = stability / (
            math.e ** (self.parameters[17] * self.parameters[18])
        )

        return min(
            next_forget_stability_long_term_params,
            next_forget_stability_short_term_params,
        )

    def _next_recall_stability(
        self,
        *,
        difficulty: float,
        stability: float,
        retrievability: float,
        rating: Rating,
    ) -> float:
        hard_penalty = self.parameters[15] if rating == Rating.Hard else 1
        easy_bonus = self.parameters[16] if rating == Rating.Easy else 1

        return stability * (
            1
            + (math.e ** (self.parameters[8]))
            * (11 - difficulty)
            * (stability ** -self.parameters[9])
            * ((math.e ** ((1 - retrievability) * self.parameters[10])) - 1)
            * hard_penalty
            * easy_bonus
        )

    def _get_fuzzed_interval(self, *, interval: timedelta) -> timedelta:
        """
        Takes the current calculated interval and adds a small amount of random fuzz to it.
        For example, a card that would've been due in 50 days, after fuzzing, might be due in 49, or 51 days.

        Args:
            interval: The calculated next interval, before fuzzing.

        Returns:
            timedelta: The new interval, after fuzzing.
        """

        interval_days = interval.days

        if interval_days < 2.5:  # fuzz is not applied to intervals less than 2.5
            return interval

        def _get_fuzz_range(*, interval_days: int) -> tuple[int, int]:
            """
            Helper function that computes the possible upper and lower bounds of the interval after fuzzing.
            """

            delta = 1.0
            for fuzz_range in FUZZ_RANGES:
                delta += fuzz_range["factor"] * max(
                    min(interval_days, fuzz_range["end"]) - fuzz_range["start"], 0.0
                )

            min_ivl = int(round(interval_days - delta))
            max_ivl = int(round(interval_days + delta))

            # make sure the min_ivl and max_ivl fall into a valid range
            min_ivl = max(2, min_ivl)
            max_ivl = min(max_ivl, self.maximum_interval)
            min_ivl = min(min_ivl, max_ivl)

            return min_ivl, max_ivl

        min_ivl, max_ivl = _get_fuzz_range(interval_days=interval_days)

        fuzzed_interval_days = (
            random() * (max_ivl - min_ivl + 1)
        ) + min_ivl  # the next interval is a random value between min_ivl and max_ivl

        fuzzed_interval_days = min(round(fuzzed_interval_days), self.maximum_interval)

        fuzzed_interval = timedelta(days=fuzzed_interval_days)

        return fuzzed_interval
The FSRS scheduler.

Enables the reviewing and future scheduling of cards according to the FSRS algorithm.

Attributes: parameters: The model weights of the FSRS scheduler. desired_retention: The desired retention rate of cards scheduled with the scheduler. learning_steps: Small time intervals that schedule cards in the Learning state. relearning_steps: Small time intervals that schedule cards in the Relearning state. maximum_interval: The maximum number of days a Review-state card can be scheduled into the future. enable_fuzzing: Whether to apply a small amount of random 'fuzz' to calculated intervals.

Scheduler(
	parameters: Sequence[float] = (0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542),
	desired_retention: float = 0.9,
	learning_steps: tuple[datetime.timedelta, ...] | list[datetime.timedelta] = (datetime.timedelta(seconds=60), datetime.timedelta(seconds=600)),
	relearning_steps: tuple[datetime.timedelta, ...] | list[datetime.timedelta] = (datetime.timedelta(seconds=600),),
	maximum_interval: int = 36500,
	enable_fuzzing: bool = True
)
    def __init__(
        self,
        parameters: Sequence[float] = DEFAULT_PARAMETERS,
        desired_retention: float = 0.9,
        learning_steps: tuple[timedelta, ...] | list[timedelta] = (
            timedelta(minutes=1),
            timedelta(minutes=10),
        ),
        relearning_steps: tuple[timedelta, ...] | list[timedelta] = (
            timedelta(minutes=10),
        ),
        maximum_interval: int = 36500,
        enable_fuzzing: bool = True,
    ) -> None:
        self._validate_parameters(parameters=parameters)

        self.parameters = tuple(parameters)
        self.desired_retention = desired_retention
        self.learning_steps = tuple(learning_steps)
        self.relearning_steps = tuple(relearning_steps)
        self.maximum_interval = maximum_interval
        self.enable_fuzzing = enable_fuzzing

        self._DECAY = -self.parameters[20]
        self._FACTOR = 0.9 ** (1 / self._DECAY) - 1
parameters: tuple[float, ...]
desired_retention: float
learning_steps: tuple[datetime.timedelta, ...]
relearning_steps: tuple[datetime.timedelta, ...]
maximum_interval: int
enable_fuzzing: bool
def get_card_retrievability(
	self,
	card: Card,
	current_datetime: datetime.datetime | None = None
) -> float:
    def get_card_retrievability(
        self, card: Card, current_datetime: datetime | None = None
    ) -> float:
        """
        Calculates a Card object's current retrievability for a given date and time.

        The retrievability of a card is the predicted probability that the card is correctly recalled at the provided datetime.

        Args:
            card: The card whose retrievability is to be calculated
            current_datetime: The current date and time

        Returns:
            float: The retrievability of the Card object.
        """

        if card.last_review is None:
            return 0

        if current_datetime is None:
            current_datetime = datetime.now(timezone.utc)

        elapsed_days = max(0, (current_datetime - card.last_review).days)

        return (1 + self._FACTOR * elapsed_days / card.stability) ** self._DECAY
Calculates a Card object's current retrievability for a given date and time.

The retrievability of a card is the predicted probability that the card is correctly recalled at the provided datetime.

Args: card: The card whose retrievability is to be calculated current_datetime: The current date and time

Returns: float: The retrievability of the Card object.

def review_card(
	self,
	card: Card,
	rating: Rating,
	review_datetime: datetime.datetime | None = None,
	review_duration: int | None = None
) -> tuple[Card, ReviewLog]:
    def review_card(
        self,
        card: Card,
        rating: Rating,
        review_datetime: datetime | None = None,
        review_duration: int | None = None,
    ) -> tuple[Card, ReviewLog]:
        """
        Reviews a card with a given rating at a given time for a specified duration.

        Args:
            card: The card being reviewed.
            rating: The chosen rating for the card being reviewed.
            review_datetime: The date and time of the review.
            review_duration: The number of miliseconds it took to review the card or None if unspecified.

        Returns:
            tuple[Card,ReviewLog]: A tuple containing the updated, reviewed card and its corresponding review log.

        Raises:
            ValueError: If the `review_datetime` argument is not timezone-aware and set to UTC.
        """

        if review_datetime is not None and (
            (review_datetime.tzinfo is None) or (review_datetime.tzinfo != timezone.utc)
        ):
            raise ValueError("datetime must be timezone-aware and set to UTC")

        card = copy(card)

        if review_datetime is None:
            review_datetime = datetime.now(timezone.utc)

        days_since_last_review = (
            (review_datetime - card.last_review).days if card.last_review else None
        )

        match card.state:
            case State.Learning:
                assert card.step is not None

                # update the card's stability and difficulty
                if card.stability is None or card.difficulty is None:
                    card.stability = self._initial_stability(rating=rating)
                    card.difficulty = self._initial_difficulty(
                        rating=rating, clamp=True
                    )

                elif days_since_last_review is not None and days_since_last_review < 1:
                    card.stability = self._short_term_stability(
                        stability=card.stability, rating=rating
                    )
                    card.difficulty = self._next_difficulty(
                        difficulty=card.difficulty, rating=rating
                    )

                else:
                    card.stability = self._next_stability(
                        difficulty=card.difficulty,
                        stability=card.stability,
                        retrievability=self.get_card_retrievability(
                            card,
                            current_datetime=review_datetime,
                        ),
                        rating=rating,
                    )
                    card.difficulty = self._next_difficulty(
                        difficulty=card.difficulty, rating=rating
                    )

                # calculate the card's next interval
                ## first if-clause handles edge case where the Card in the Learning state was previously
                ## scheduled with a Scheduler with more learning_steps than the current Scheduler
                if len(self.learning_steps) == 0 or (
                    card.step >= len(self.learning_steps)
                    and rating in (Rating.Hard, Rating.Good, Rating.Easy)
                ):
                    card.state = State.Review
                    card.step = None

                    next_interval_days = self._next_interval(stability=card.stability)
                    next_interval = timedelta(days=next_interval_days)

                else:
                    match rating:
                        case Rating.Again:
                            card.step = 0
                            next_interval = self.learning_steps[card.step]

                        case Rating.Hard:
                            # card step stays the same

                            if card.step == 0 and len(self.learning_steps) == 1:
                                next_interval = self.learning_steps[0] * 1.5
                            elif card.step == 0 and len(self.learning_steps) >= 2:
                                next_interval = (
                                    self.learning_steps[0] + self.learning_steps[1]
                                ) / 2.0
                            else:
                                next_interval = self.learning_steps[card.step]

                        case Rating.Good:
                            if card.step + 1 == len(
                                self.learning_steps
                            ):  # the last step
                                card.state = State.Review
                                card.step = None

                                next_interval_days = self._next_interval(
                                    stability=card.stability
                                )
                                next_interval = timedelta(days=next_interval_days)

                            else:
                                card.step += 1
                                next_interval = self.learning_steps[card.step]

                        case Rating.Easy:
                            card.state = State.Review
                            card.step = None

                            next_interval_days = self._next_interval(
                                stability=card.stability
                            )
                            next_interval = timedelta(days=next_interval_days)

            case State.Review:
                assert card.stability is not None
                assert card.difficulty is not None

                # update the card's stability and difficulty
                if days_since_last_review is not None and days_since_last_review < 1:
                    card.stability = self._short_term_stability(
                        stability=card.stability, rating=rating
                    )
                else:
                    card.stability = self._next_stability(
                        difficulty=card.difficulty,
                        stability=card.stability,
                        retrievability=self.get_card_retrievability(
                            card,
                            current_datetime=review_datetime,
                        ),
                        rating=rating,
                    )

                card.difficulty = self._next_difficulty(
                    difficulty=card.difficulty, rating=rating
                )

                # calculate the card's next interval
                match rating:
                    case Rating.Again:
                        # if there are no relearning steps (they were left blank)
                        if len(self.relearning_steps) == 0:
                            next_interval_days = self._next_interval(
                                stability=card.stability
                            )
                            next_interval = timedelta(days=next_interval_days)

                        else:
                            card.state = State.Relearning
                            card.step = 0

                            next_interval = self.relearning_steps[card.step]

                    case Rating.Hard | Rating.Good | Rating.Easy:
                        next_interval_days = self._next_interval(
                            stability=card.stability
                        )
                        next_interval = timedelta(days=next_interval_days)

            case State.Relearning:
                assert card.stability is not None
                assert card.difficulty is not None
                assert card.step is not None

                # update the card's stability and difficulty
                if days_since_last_review is not None and days_since_last_review < 1:
                    card.stability = self._short_term_stability(
                        stability=card.stability, rating=rating
                    )
                    card.difficulty = self._next_difficulty(
                        difficulty=card.difficulty, rating=rating
                    )

                else:
                    card.stability = self._next_stability(
                        difficulty=card.difficulty,
                        stability=card.stability,
                        retrievability=self.get_card_retrievability(
                            card,
                            current_datetime=review_datetime,
                        ),
                        rating=rating,
                    )
                    card.difficulty = self._next_difficulty(
                        difficulty=card.difficulty, rating=rating
                    )

                # calculate the card's next interval
                ## first if-clause handles edge case where the Card in the Relearning state was previously
                ## scheduled with a Scheduler with more relearning_steps than the current Scheduler
                if len(self.relearning_steps) == 0 or (
                    card.step >= len(self.relearning_steps)
                    and rating in (Rating.Hard, Rating.Good, Rating.Easy)
                ):
                    card.state = State.Review
                    card.step = None

                    next_interval_days = self._next_interval(stability=card.stability)
                    next_interval = timedelta(days=next_interval_days)

                else:
                    match rating:
                        case Rating.Again:
                            card.step = 0
                            next_interval = self.relearning_steps[card.step]

                        case Rating.Hard:
                            # card step stays the same

                            if card.step == 0 and len(self.relearning_steps) == 1:
                                next_interval = self.relearning_steps[0] * 1.5
                            elif card.step == 0 and len(self.relearning_steps) >= 2:
                                next_interval = (
                                    self.relearning_steps[0] + self.relearning_steps[1]
                                ) / 2.0
                            else:
                                next_interval = self.relearning_steps[card.step]

                        case Rating.Good:
                            if card.step + 1 == len(
                                self.relearning_steps
                            ):  # the last step
                                card.state = State.Review
                                card.step = None

                                next_interval_days = self._next_interval(
                                    stability=card.stability
                                )
                                next_interval = timedelta(days=next_interval_days)

                            else:
                                card.step += 1
                                next_interval = self.relearning_steps[card.step]

                        case Rating.Easy:
                            card.state = State.Review
                            card.step = None

                            next_interval_days = self._next_interval(
                                stability=card.stability
                            )
                            next_interval = timedelta(days=next_interval_days)

        if self.enable_fuzzing and card.state == State.Review:
            next_interval = self._get_fuzzed_interval(interval=next_interval)

        card.due = review_datetime + next_interval
        card.last_review = review_datetime

        review_log = ReviewLog(
            card_id=card.card_id,
            rating=rating,
            review_datetime=review_datetime,
            review_duration=review_duration,
        )

        return card, review_log
Reviews a card with a given rating at a given time for a specified duration.

Args: card: The card being reviewed. rating: The chosen rating for the card being reviewed. review_datetime: The date and time of the review. review_duration: The number of miliseconds it took to review the card or None if unspecified.

Returns: tuple[Card,ReviewLog]: A tuple containing the updated, reviewed card and its corresponding review log.

Raises: ValueError: If the review_datetime argument is not timezone-aware and set to UTC.

def reschedule_card(
	self,
	card: Card,
	review_logs: list[ReviewLog]
) -> Card:
    def reschedule_card(self, card: Card, review_logs: list[ReviewLog]) -> Card:
        """
        Reschedules/updates the given card with the current scheduler provided that card's review logs.

        If the current card was previously scheduled with a different scheduler, you may want to reschedule/update
        it as if it had always been scheduled with this current scheduler. For example, you may want to reschedule
        each of your cards with a new scheduler after computing the optimal parameters with the Optimizer.

        Args:
            card: The card to be rescheduled/updated.
            review_logs: A list of that card's review logs (order doesn't matter).

        Returns:
            Card: A new card that has been rescheduled/updated with this current scheduler.

        Raises:
            ValueError: If any of the review logs are for a card other than the one specified, this will raise an error.

        """

        for review_log in review_logs:
            if review_log.card_id != card.card_id:
                raise ValueError(
                    f"ReviewLog card_id {review_log.card_id} does not match Card card_id {card.card_id}"
                )

        review_logs = sorted(review_logs, key=lambda log: log.review_datetime)

        rescheduled_card = Card(card_id=card.card_id, due=card.due)

        for review_log in review_logs:
            rescheduled_card, _ = self.review_card(
                card=rescheduled_card,
                rating=review_log.rating,
                review_datetime=review_log.review_datetime,
            )

        return rescheduled_card
Reschedules/updates the given card with the current scheduler provided that card's review logs.

If the current card was previously scheduled with a different scheduler, you may want to reschedule/update it as if it had always been scheduled with this current scheduler. For example, you may want to reschedule each of your cards with a new scheduler after computing the optimal parameters with the Optimizer.

Args: card: The card to be rescheduled/updated. review_logs: A list of that card's review logs (order doesn't matter).

Returns: Card: A new card that has been rescheduled/updated with this current scheduler.

Raises: ValueError: If any of the review logs are for a card other than the one specified, this will raise an error.

def to_dict(self) -> fsrs.scheduler.SchedulerDict:
    def to_dict(
        self,
    ) -> SchedulerDict:
        """
        Returns a dictionary representation of the Scheduler object.

        Returns:
            SchedulerDict: A dictionary representation of the Scheduler object.
        """

        return {
            "parameters": list(self.parameters),
            "desired_retention": self.desired_retention,
            "learning_steps": [
                int(learning_step.total_seconds())
                for learning_step in self.learning_steps
            ],
            "relearning_steps": [
                int(relearning_step.total_seconds())
                for relearning_step in self.relearning_steps
            ],
            "maximum_interval": self.maximum_interval,
            "enable_fuzzing": self.enable_fuzzing,
        }
Returns a dictionary representation of the Scheduler object.

Returns: SchedulerDict: A dictionary representation of the Scheduler object.

@classmethod
def from_dict(cls, source_dict: fsrs.scheduler.SchedulerDict) -> Self:
    @classmethod
    def from_dict(cls, source_dict: SchedulerDict) -> Self:
        """
        Creates a Scheduler object from an existing dictionary.

        Args:
            source_dict: A dictionary representing an existing Scheduler object.

        Returns:
            Self: A Scheduler object created from the provided dictionary.
        """

        return cls(
            parameters=source_dict["parameters"],
            desired_retention=source_dict["desired_retention"],
            learning_steps=[
                timedelta(seconds=learning_step)
                for learning_step in source_dict["learning_steps"]
            ],
            relearning_steps=[
                timedelta(seconds=relearning_step)
                for relearning_step in source_dict["relearning_steps"]
            ],
            maximum_interval=source_dict["maximum_interval"],
            enable_fuzzing=source_dict["enable_fuzzing"],
        )
Creates a Scheduler object from an existing dictionary.

Args: source_dict: A dictionary representing an existing Scheduler object.

Returns: Self: A Scheduler object created from the provided dictionary.

def to_json(self, indent: int | str | None = None) -> str:
    def to_json(self, indent: int | str | None = None) -> str:
        """
        Returns a JSON-serialized string of the Scheduler object.

        Args:
            indent: Equivalent argument to the indent in json.dumps()

        Returns:
            str: A JSON-serialized string of the Scheduler object.
        """

        return json.dumps(self.to_dict(), indent=indent)
Returns a JSON-serialized string of the Scheduler object.

Args: indent: Equivalent argument to the indent in json.dumps()

Returns: str: A JSON-serialized string of the Scheduler object.

@classmethod
def from_json(cls, source_json: str) -> Self:
    @classmethod
    def from_json(cls, source_json: str) -> Self:
        """
        Creates a Scheduler object from a JSON-serialized string.

        Args:
            source_json: A JSON-serialized string of an existing Scheduler object.

        Returns:
            Self: A Scheduler object created from the JSON string.
        """

        source_dict: SchedulerDict = json.loads(source_json)
        return cls.from_dict(source_dict=source_dict)
Creates a Scheduler object from a JSON-serialized string.

Args: source_json: A JSON-serialized string of an existing Scheduler object.

Returns: Self: A Scheduler object created from the JSON string.

@dataclass(init=False)
class Card:
@dataclass(init=False)
class Card:
    """
    Represents a flashcard in the FSRS system.

    Attributes:
        card_id: The id of the card. Defaults to the epoch milliseconds of when the card was created.
        state: The card's current learning state.
        step: The card's current learning or relearning step or None if the card is in the Review state.
        stability: Core mathematical parameter used for future scheduling.
        difficulty: Core mathematical parameter used for future scheduling.
        due: The date and time when the card is due next.
        last_review: The date and time of the card's last review.
    """

    card_id: int
    state: State
    step: int | None
    stability: float | None
    difficulty: float | None
    due: datetime
    last_review: datetime | None

    def __init__(
        self,
        card_id: int | None = None,
        state: State = State.Learning,
        step: int | None = None,
        stability: float | None = None,
        difficulty: float | None = None,
        due: datetime | None = None,
        last_review: datetime | None = None,
    ) -> None:
        if card_id is None:
            # epoch milliseconds of when the card was created
            card_id = int(datetime.now(timezone.utc).timestamp() * 1000)
            # wait 1ms to prevent potential card_id collision on next Card creation
            time.sleep(0.001)
        self.card_id = card_id

        self.state = state

        if self.state == State.Learning and step is None:
            step = 0
        self.step = step

        self.stability = stability
        self.difficulty = difficulty

        if due is None:
            due = datetime.now(timezone.utc)
        self.due = due

        self.last_review = last_review

    def to_dict(self) -> CardDict:
        """
        Returns a dictionary representation of the Card object.

        Returns:
            CardDict: A dictionary representation of the Card object.
        """

        return {
            "card_id": self.card_id,
            "state": self.state.value,
            "step": self.step,
            "stability": self.stability,
            "difficulty": self.difficulty,
            "due": self.due.isoformat(),
            "last_review": self.last_review.isoformat() if self.last_review else None,
        }

    @classmethod
    def from_dict(cls, source_dict: CardDict) -> Self:
        """
        Creates a Card object from an existing dictionary.

        Args:
            source_dict: A dictionary representing an existing Card object.

        Returns:
            Self: A Card object created from the provided dictionary.
        """

        return cls(
            card_id=int(source_dict["card_id"]),
            state=State(int(source_dict["state"])),
            step=source_dict["step"],
            stability=(
                float(source_dict["stability"]) if source_dict["stability"] else None
            ),
            difficulty=(
                float(source_dict["difficulty"]) if source_dict["difficulty"] else None
            ),
            due=datetime.fromisoformat(source_dict["due"]),
            last_review=(
                datetime.fromisoformat(source_dict["last_review"])
                if source_dict["last_review"]
                else None
            ),
        )

    def to_json(self, indent: int | str | None = None) -> str:
        """
        Returns a JSON-serialized string of the Card object.

        Args:
            indent: Equivalent argument to the indent in json.dumps()

        Returns:
            str: A JSON-serialized string of the Card object.
        """
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_json(cls, source_json: str) -> Self:
        """
        Creates a Card object from a JSON-serialized string.

        Args:
            source_json: A JSON-serialized string of an existing Card object.

        Returns:
            Self: A Card object created from the JSON string.
        """

        source_dict: CardDict = json.loads(source_json)
        return cls.from_dict(source_dict=source_dict)
Represents a flashcard in the FSRS system.

Attributes: card_id: The id of the card. Defaults to the epoch milliseconds of when the card was created. state: The card's current learning state. step: The card's current learning or relearning step or None if the card is in the Review state. stability: Core mathematical parameter used for future scheduling. difficulty: Core mathematical parameter used for future scheduling. due: The date and time when the card is due next. last_review: The date and time of the card's last review.

Card(
	card_id: int | None = None,
	state: State = <State.Learning: 1>,
	step: int | None = None,
	stability: float | None = None,
	difficulty: float | None = None,
	due: datetime.datetime | None = None,
	last_review: datetime.datetime | None = None
)
    def __init__(
        self,
        card_id: int | None = None,
        state: State = State.Learning,
        step: int | None = None,
        stability: float | None = None,
        difficulty: float | None = None,
        due: datetime | None = None,
        last_review: datetime | None = None,
    ) -> None:
        if card_id is None:
            # epoch milliseconds of when the card was created
            card_id = int(datetime.now(timezone.utc).timestamp() * 1000)
            # wait 1ms to prevent potential card_id collision on next Card creation
            time.sleep(0.001)
        self.card_id = card_id

        self.state = state

        if self.state == State.Learning and step is None:
            step = 0
        self.step = step

        self.stability = stability
        self.difficulty = difficulty

        if due is None:
            due = datetime.now(timezone.utc)
        self.due = due

        self.last_review = last_review
card_id: int
state: State
step: int | None
stability: float | None
difficulty: float | None
due: datetime.datetime
last_review: datetime.datetime | None
def to_dict(self) -> fsrs.card.CardDict:
    def to_dict(self) -> CardDict:
        """
        Returns a dictionary representation of the Card object.

        Returns:
            CardDict: A dictionary representation of the Card object.
        """

        return {
            "card_id": self.card_id,
            "state": self.state.value,
            "step": self.step,
            "stability": self.stability,
            "difficulty": self.difficulty,
            "due": self.due.isoformat(),
            "last_review": self.last_review.isoformat() if self.last_review else None,
        }
Returns a dictionary representation of the Card object.

Returns: CardDict: A dictionary representation of the Card object.

@classmethod
def from_dict(cls, source_dict: fsrs.card.CardDict) -> Self:
    @classmethod
    def from_dict(cls, source_dict: CardDict) -> Self:
        """
        Creates a Card object from an existing dictionary.

        Args:
            source_dict: A dictionary representing an existing Card object.

        Returns:
            Self: A Card object created from the provided dictionary.
        """

        return cls(
            card_id=int(source_dict["card_id"]),
            state=State(int(source_dict["state"])),
            step=source_dict["step"],
            stability=(
                float(source_dict["stability"]) if source_dict["stability"] else None
            ),
            difficulty=(
                float(source_dict["difficulty"]) if source_dict["difficulty"] else None
            ),
            due=datetime.fromisoformat(source_dict["due"]),
            last_review=(
                datetime.fromisoformat(source_dict["last_review"])
                if source_dict["last_review"]
                else None
            ),
        )
Creates a Card object from an existing dictionary.

Args: source_dict: A dictionary representing an existing Card object.

Returns: Self: A Card object created from the provided dictionary.

def to_json(self, indent: int | str | None = None) -> str:
    def to_json(self, indent: int | str | None = None) -> str:
        """
        Returns a JSON-serialized string of the Card object.

        Args:
            indent: Equivalent argument to the indent in json.dumps()

        Returns:
            str: A JSON-serialized string of the Card object.
        """
        return json.dumps(self.to_dict(), indent=indent)
Returns a JSON-serialized string of the Card object.

Args: indent: Equivalent argument to the indent in json.dumps()

Returns: str: A JSON-serialized string of the Card object.

@classmethod
def from_json(cls, source_json: str) -> Self:
    @classmethod
    def from_json(cls, source_json: str) -> Self:
        """
        Creates a Card object from a JSON-serialized string.

        Args:
            source_json: A JSON-serialized string of an existing Card object.

        Returns:
            Self: A Card object created from the JSON string.
        """

        source_dict: CardDict = json.loads(source_json)
        return cls.from_dict(source_dict=source_dict)
Creates a Card object from a JSON-serialized string.

Args: source_json: A JSON-serialized string of an existing Card object.

Returns: Self: A Card object created from the JSON string.

class Rating(enum.IntEnum):
class Rating(IntEnum):
    """
    Enum representing the four possible ratings when reviewing a card.
    """

    Again = 1
    Hard = 2
    Good = 3
    Easy = 4
Enum representing the four possible ratings when reviewing a card.

Again = <Rating.Again: 1>
Hard = <Rating.Hard: 2>
Good = <Rating.Good: 3>
Easy = <Rating.Easy: 4>
@dataclass
class ReviewLog:
@dataclass
class ReviewLog:
    """
    Represents the log entry of a Card object that has been reviewed.

    Attributes:
        card_id: The id of the card being reviewed.
        rating: The rating given to the card during the review.
        review_datetime: The date and time of the review.
        review_duration: The number of milliseconds it took to review the card or None if unspecified.
    """

    card_id: int
    rating: Rating
    review_datetime: datetime
    review_duration: int | None

    def to_dict(
        self,
    ) -> ReviewLogDict:
        """
        Returns a dictionary representation of the ReviewLog object.

        Returns:
            ReviewLogDict: A dictionary representation of the ReviewLog object.
        """

        return {
            "card_id": self.card_id,
            "rating": int(self.rating),
            "review_datetime": self.review_datetime.isoformat(),
            "review_duration": self.review_duration,
        }

    @classmethod
    def from_dict(
        cls,
        source_dict: ReviewLogDict,
    ) -> Self:
        """
        Creates a ReviewLog object from an existing dictionary.

        Args:
            source_dict: A dictionary representing an existing ReviewLog object.

        Returns:
            Self: A ReviewLog object created from the provided dictionary.
        """

        return cls(
            card_id=source_dict["card_id"],
            rating=Rating(int(source_dict["rating"])),
            review_datetime=datetime.fromisoformat(source_dict["review_datetime"]),
            review_duration=source_dict["review_duration"],
        )

    def to_json(self, indent: int | str | None = None) -> str:
        """
        Returns a JSON-serialized string of the ReviewLog object.

        Args:
            indent: Equivalent argument to the indent in json.dumps()

        Returns:
            str: A JSON-serialized string of the ReviewLog object.
        """

        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_json(cls, source_json: str) -> Self:
        """
        Creates a ReviewLog object from a JSON-serialized string.

        Args:
            source_json: A JSON-serialized string of an existing ReviewLog object.

        Returns:
            Self: A ReviewLog object created from the JSON string.
        """

        source_dict: ReviewLogDict = json.loads(source_json)
        return cls.from_dict(source_dict=source_dict)
Represents the log entry of a Card object that has been reviewed.

Attributes: card_id: The id of the card being reviewed. rating: The rating given to the card during the review. review_datetime: The date and time of the review. review_duration: The number of milliseconds it took to review the card or None if unspecified.

ReviewLog(
	card_id: int,
	rating: Rating,
	review_datetime: datetime.datetime,
	review_duration: int | None
)
card_id: int
rating: Rating
review_datetime: datetime.datetime
review_duration: int | None
def to_dict(self) -> fsrs.review_log.ReviewLogDict:
    def to_dict(
        self,
    ) -> ReviewLogDict:
        """
        Returns a dictionary representation of the ReviewLog object.

        Returns:
            ReviewLogDict: A dictionary representation of the ReviewLog object.
        """

        return {
            "card_id": self.card_id,
            "rating": int(self.rating),
            "review_datetime": self.review_datetime.isoformat(),
            "review_duration": self.review_duration,
        }
Returns a dictionary representation of the ReviewLog object.

Returns: ReviewLogDict: A dictionary representation of the ReviewLog object.

@classmethod
def from_dict(cls, source_dict: fsrs.review_log.ReviewLogDict) -> Self:
    @classmethod
    def from_dict(
        cls,
        source_dict: ReviewLogDict,
    ) -> Self:
        """
        Creates a ReviewLog object from an existing dictionary.

        Args:
            source_dict: A dictionary representing an existing ReviewLog object.

        Returns:
            Self: A ReviewLog object created from the provided dictionary.
        """

        return cls(
            card_id=source_dict["card_id"],
            rating=Rating(int(source_dict["rating"])),
            review_datetime=datetime.fromisoformat(source_dict["review_datetime"]),
            review_duration=source_dict["review_duration"],
        )
Creates a ReviewLog object from an existing dictionary.

Args: source_dict: A dictionary representing an existing ReviewLog object.

Returns: Self: A ReviewLog object created from the provided dictionary.

def to_json(self, indent: int | str | None = None) -> str:
    def to_json(self, indent: int | str | None = None) -> str:
        """
        Returns a JSON-serialized string of the ReviewLog object.

        Args:
            indent: Equivalent argument to the indent in json.dumps()

        Returns:
            str: A JSON-serialized string of the ReviewLog object.
        """

        return json.dumps(self.to_dict(), indent=indent)
Returns a JSON-serialized string of the ReviewLog object.

Args: indent: Equivalent argument to the indent in json.dumps()

Returns: str: A JSON-serialized string of the ReviewLog object.

@classmethod
def from_json(cls, source_json: str) -> Self:
    @classmethod
    def from_json(cls, source_json: str) -> Self:
        """
        Creates a ReviewLog object from a JSON-serialized string.

        Args:
            source_json: A JSON-serialized string of an existing ReviewLog object.

        Returns:
            Self: A ReviewLog object created from the JSON string.
        """

        source_dict: ReviewLogDict = json.loads(source_json)
        return cls.from_dict(source_dict=source_dict)
Creates a ReviewLog object from a JSON-serialized string.

Args: source_json: A JSON-serialized string of an existing ReviewLog object.

Returns: Self: A ReviewLog object created from the JSON string.

class State(enum.IntEnum):
class State(IntEnum):
    """
    Enum representing the learning state of a Card object.
    """

    Learning = 1
    Review = 2
    Relearning = 3
Enum representing the learning state of a Card object.

Learning = <State.Learning: 1>
Review = <State.Review: 2>
Relearning = <State.Relearning: 3>
class Optimizer:
    class Optimizer:
        def __init__(self, *args, **kwargs) -> None:
            raise ImportError(
                'Optimizer is not installed.\nInstall it with: pip install "fsrs[optimizer]"'
            )
Optimizer(*args, **kwargs)
        def __init__(self, *args, **kwargs) -> None:
            raise ImportError(
                'Optimizer is not installed.\nInstall it with: pip install "fsrs[optimizer]"'
            )


            Py-FSRS
🧠🔄 Build your own Spaced Repetition System in Python 🧠🔄

        

Py-FSRS is a python package that allows developers to easily create their own spaced repetition system using the Free Spaced Repetition Scheduler algorithm.

Table of Contents
Installation
Quickstart
Usage
Optimizer (optional)
Reference
API Documentation
Interactive Demo
Other FSRS implementations
Other SRS python packages
Contribute
Installation
You can install the fsrs python package from PyPI using pip:

pip install fsrs
Quickstart
Import and initialize the FSRS scheduler

from fsrs import Scheduler, Card, Rating, ReviewLog

scheduler = Scheduler()
Create a new Card object

# NOTE: all new cards are due immediately upon creation
card = Card()
Choose a rating and review the card with the scheduler

# Rating.Again (==1) forgot the card
# Rating.Hard (==2) remembered the card with serious difficulty
# Rating.Good (==3) remembered the card after a hesitation
# Rating.Easy (==4) remembered the card easily

rating = Rating.Good

card, review_log = scheduler.review_card(card, rating)

print(f"Card rated {review_log.rating} at {review_log.review_datetime}")
# > Card rated 3 at 2024-11-30 17:46:58.856497+00:00
See when the card is due next

from datetime import datetime, timezone

due = card.due

# how much time between when the card is due and now
time_delta = due - datetime.now(timezone.utc)

print(f"Card due on {due}")
print(f"Card due in {time_delta.seconds} seconds")

# > Card due on 2024-11-30 18:42:36.070712+00:00
# > Card due in 599 seconds
Usage
Custom parameters
You can initialize the FSRS scheduler with your own custom parameters.

from datetime import timedelta

# NOTE: the following arguments are also the defaults
scheduler = Scheduler(
    parameters = (
            0.212,
            1.2931,
            2.3065,
            8.2956,
            6.4133,
            0.8334,
            3.0194,
            0.001,
            1.8722,
            0.1666,
            0.796,
            1.4835,
            0.0614,
            0.2629,
            1.6483,
            0.6014,
            1.8729,
            0.5425,
            0.0912,
            0.0658,
            0.1542,
    ),
    desired_retention = 0.9,
    learning_steps = (timedelta(minutes=1), timedelta(minutes=10)),
    relearning_steps = (timedelta(minutes=10),),
    maximum_interval = 36500,
    enable_fuzzing = True
)
Explanation of parameters
parameters are a set of 21 model weights that affect how the FSRS scheduler will schedule future reviews. If you're not familiar with optimizing FSRS, it is best not to modify these default values.

desired_retention is a value between 0 and 1 that sets the desired minimum retention rate for cards when scheduled with the scheduler. For example, with the default value of desired_retention=0.9, a card will be scheduled at a time in the future when the predicted probability of the user correctly recalling that card falls to 90%. A higher desired_retention rate will lead to more reviews and a lower rate will lead to fewer reviews.

learning_steps are custom time intervals that schedule new cards in the Learning state. By default, cards in the Learning state have short intervals of 1 minute then 10 minutes. You can also disable learning_steps with Scheduler(learning_steps=())

relearning_steps are analogous to learning_steps except they apply to cards in the Relearning state. Cards transition to the Relearning state if they were previously in the Review state, then were rated Again - this is also known as a 'lapse'. If you specify Scheduler(relearning_steps=()), cards in the Review state, when lapsed, will not move to the Relearning state, but instead stay in the Review state.

maximum_interval sets the cap for the maximum days into the future the scheduler is capable of scheduling cards. For example, if you never want the scheduler to schedule a card more than one year into the future, you'd set Scheduler(maximum_interval=365).

enable_fuzzing, if set to True, will apply a small amount of random 'fuzz' to calculated intervals. For example, a card that would've been due in 50 days, after fuzzing, might be due in 49, or 51 days.

Timezone
Py-FSRS uses UTC only.

You can still specify custom datetimes, but they must use the UTC timezone.

Retrievability
You can calculate the current probability of correctly recalling a card (its 'retrievability') with

retrievability = scheduler.get_card_retrievability(card)

print(f"There is a {retrievability} probability that this card is remembered.")
# > There is a 0.94 probability that this card is remembered.
JSON-Serialization
Scheduler, Card and ReviewLog objects are all JSON-serializable via their to_json and from_json methods for easy database storage, network requests, etc:

# serialize
scheduler_json = scheduler.to_json()
card_json = card.to_json()
review_log_json = review_log.to_json()

# deserialize
scheduler = Scheduler.from_json(scheduler_json)
card = Card.from_json(card_json)
review_log = ReviewLog.from_json(review_log_json)
Optimizer (optional)
If you have a collection of ReviewLog objects, you can optionally reuse them to compute an optimal set of parameters for the Scheduler to make it more accurate at scheduling reviews. You can also compute an optimal retention rate to reduce the future workload of your reviews.

Installation
pip install "fsrs[optimizer]"
Optimize scheduler parameters
from fsrs import ReviewLog, Optimizer, Scheduler

# load your ReviewLog objects into a list (order doesn't matter)
review_logs = [ReviewLog1, ReviewLog2, ...]

# initialize the optimizer with the review logs
optimizer = Optimizer(review_logs)

# compute a set of optimized parameters
optimal_parameters = optimizer.compute_optimal_parameters()

# initialize a new scheduler with the optimized parameters
scheduler = Scheduler(optimal_parameters)
Optimize desired retention
optimal_retention = optimizer.compute_optimal_retention(optimal_parameters)

# initialize a new scheduler with both optimized parameters and retention
optimal_scheduler = Scheduler(optimal_parameters, optimal_retention)
Note

The computed optimal parameters and retention may be slightly different than the numbers computed by Anki for the same set of review logs. This is because the two implementations are slightly different and updated at different times. If you're interested in the official Rust-based Anki implementation, please see here.

Reschedule cards after optimization
After creating a new scheduler with optimized parameters, you may want to reschedule/update each of your previous cards with this new scheduler.

# repeat the following for each of your cards
rescheduled_card = optimal_scheduler.reschedule_card(card, review_logs_for_that_card)
Reference
Card objects have one of three possible states

State.Learning # (==1) new card being studied for the first time
State.Review # (==2) card that has "graduated" from the Learning state
State.Relearning # (==3) card that has "lapsed" from the Review state
There are four possible ratings when reviewing a card object:

Rating.Again # (==1) forgot the card
Rating.Hard # (==2) remembered the card with serious difficulty
Rating.Good # (==3) remembered the card after a hesitation
Rating.Easy # (==4) remembered the card easily
API Documentation
You can find additional documentation for py-fsrs here.

Interactive Demo
Developers who'd like a visual understanding of how py-fsrs works can check out this interactive-demo.

Other FSRS implementations
You can find various other FSRS implementations and projects here.

Other SRS python packages
The following spaced repetition schedulers are also available as python packages:

SM-2
Leitner System
Anki Default Scheduler
Contribute
If you encounter issues with py-fsrs or would like to contribute code, please see CONTRIBUTING.