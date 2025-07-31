import { Result, Success, Failure } from '../../../shared/types/Result';

export interface UserProps {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  role: UserRole;
  profileId?: string;
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
    props: Omit<UserProps, 'createdAt' | 'updatedAt' | 'isActive'>,
  ): Result<User> {
    try {
      const user = new User({
        ...props,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
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

  get name(): string {
    return this.props.name;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get profileId(): string | undefined {
    return this.props.profileId;
  }

  // Methods
  public deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  public activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  public update(props: Partial<Omit<UserProps, 'id' | 'createdAt'>>): void {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
    };
  }

  public toJSON(): UserProps {
    return { ...this.props };
  }
}
