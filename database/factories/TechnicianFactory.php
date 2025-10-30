<?php

namespace Database\Factories;

use App\Models\Technician;
use Illuminate\Database\Eloquent\Factories\Factory;

class TechnicianFactory extends Factory
{
    protected $model = Technician::class;

    public function definition(): array
    {
        return [
            'first_name' => $this->faker->firstName(),
            'last_name' => $this->faker->lastName(),
            'email' => $this->faker->unique()->safeEmail(),
            'password' => 'password',
            'address' => $this->faker->address(),
            'expertise' => $this->faker->randomElement(['Mobile Repair','Laptop Repair','Tablet Repair']),
        ];
    }
}


