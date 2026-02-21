import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email required'),
});

type FormData = z.infer<typeof schema>;

interface ProfileSetupProps {
  onNext: () => void;
}

export function ProfileSetup({ onNext }: ProfileSetupProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (_data: FormData) => {
    onNext();
  };

  return (
    <Card>
      <h2 className="text-xl font-semibold mb-2">Your profile</h2>
      <p className="text-text-secondary text-sm mb-6">
        Tell us a bit about yourself to get started.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">First name</label>
          <input
            {...register('firstName')}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
            placeholder="Marcus"
          />
          {errors.firstName && <p className="text-sm text-danger mt-1">{errors.firstName.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Last name</label>
          <input
            {...register('lastName')}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
            placeholder="Johnson"
          />
          {errors.lastName && <p className="text-sm text-danger mt-1">{errors.lastName.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
          <input
            {...register('email')}
            type="email"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
            placeholder="marcus@email.com"
          />
          {errors.email && <p className="text-sm text-danger mt-1">{errors.email.message}</p>}
        </div>
        <Button type="submit" className="w-full">Continue</Button>
      </form>
    </Card>
  );
}
