import { Result, Success, Failure } from '../../../shared/types/Result';

export interface UserProps {
  id: string;
  email: string;
  display_name: string;
  username_slug: string;
  created_at: Date;
  updated_at: Date;
  user_role: UserRole;
  mastered_flashcards?: number;
  total_decks?: number;
  total_flashcards?: number;
  active_flashcards?: number;
  last_login?: Date;
}

export enum UserRole {
  STUDENT = 'STUDENT',
  MENTOR = 'MENTOR',
  ADMIN = 'ADMIN',
}

export class User {
  private props: UserProps;

  private constructor(props: UserProps) {
    this.props = props;
  }

  public static create(
    props: Omit<UserProps, 'created_at' | 'updated_at'>,
  ): Result<User> {
    try {
      const user = new User({
        ...props,
        created_at: new Date(),
        updated_at: new Date(),
      });

      return Success(user);
    } catch (error) {
      return Failure(error as Error);
    }
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get display_name(): string {
    return this.props.display_name;
  }

  get username_slug(): string {
    return this.props.username_slug;
  }

  get user_role(): UserRole {
    return this.props.user_role;
  }



  get mastered_flashcards(): number | undefined {
    return this.props.mastered_flashcards;
  }

  get total_decks(): number | undefined {
    return this.props.total_decks;
  }

  get total_flashcards(): number | undefined {
    return this.props.total_flashcards;
  }

  get active_flashcards(): number | undefined {
    return this.props.active_flashcards;
  }

  get last_login(): Date | undefined {
    return this.props.last_login;
  }

  get created_at(): Date {
    return this.props.created_at;
  }

  get updated_at(): Date {
    return this.props.updated_at;
  }



  // Methods
  public updateLastLogin(): void {
    this.props.last_login = new Date();
    this.props.updated_at = new Date();
  }

  public update(props: Partial<Omit<UserProps, 'id' | 'created_at'>>): void {
    this.props = {
      ...this.props,
      ...props,
      updated_at: new Date(),
    };
  }

  public toJSON(): UserProps {
    return { ...this.props };
  }
}
